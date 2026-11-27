"""Like service: record likes, detect mutual likes to create a match.

Duplicate-like handling (documented choice): a repeat `POST /likes` for the
same (from, to) pair is **idempotent-201**, not 409 -- it returns the
original like's id and current match status instead of erroring. This
keeps retrying clients (flaky network, double-tap) safe without needing
special-case error handling on the client.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from packages.api.features.likes.models import Like
from packages.api.features.likes.quota_service import DAILY_LIKE_LIMIT, count_used_today
from packages.api.features.matches.match_service import (
    find_match_for_pair,
    get_or_create_match_for_pair,
)
from packages.api.features.notifications import notification_service
from packages.api.features.profiles.models import Profile


class LikeQuotaExceededError(Exception):
    """Raised when a profile has used its full daily like quota."""


class SelfLikeError(Exception):
    """Raised when a profile attempts to like itself."""


@dataclass
class LikeResult:
    like_id: uuid.UUID
    matched: bool
    match_id: uuid.UUID | None


def _idempotent_result(
    db: Session, from_profile_id: uuid.UUID, to_profile_id: uuid.UUID
) -> LikeResult:
    existing = db.execute(
        select(Like).where(
            Like.from_profile_id == from_profile_id, Like.to_profile_id == to_profile_id
        )
    ).scalar_one_or_none()
    assert existing is not None  # caller only reaches here when the row exists
    match = find_match_for_pair(db, from_profile_id, to_profile_id)
    return LikeResult(existing.id, match is not None, match.id if match else None)


def create_like(db: Session, from_profile_id: uuid.UUID, to_profile_id: uuid.UUID) -> LikeResult:
    """Record a like from `from_profile_id` to `to_profile_id`.

    - Enforces the 20/day quota (raises LikeQuotaExceededError once used).
    - Idempotent on repeat likes for the same pair (see module docstring).
    - If the reverse like already exists, atomically creates exactly one
      Match row (normalized pair ordering) and reports `matched=True`.
    """
    if from_profile_id == to_profile_id:
        raise SelfLikeError("a profile cannot like itself")

    existing = db.execute(
        select(Like.id).where(
            Like.from_profile_id == from_profile_id, Like.to_profile_id == to_profile_id
        )
    ).scalar_one_or_none()
    if existing is not None:
        return _idempotent_result(db, from_profile_id, to_profile_id)

    if not count_used_today(db, from_profile_id) < DAILY_LIKE_LIMIT:
        raise LikeQuotaExceededError("daily like quota exceeded")

    like = Like(from_profile_id=from_profile_id, to_profile_id=to_profile_id)
    db.add(like)
    try:
        db.flush()
    except IntegrityError:
        # Lost a race against a concurrent identical request for this exact
        # pair -- fall back to the idempotent read path instead of erroring.
        db.rollback()
        return _idempotent_result(db, from_profile_id, to_profile_id)

    reverse_exists = (
        db.execute(
            select(Like.id).where(
                Like.from_profile_id == to_profile_id, Like.to_profile_id == from_profile_id
            )
        ).scalar_one_or_none()
        is not None
    )

    matched = False
    match_id = None
    if reverse_exists:
        match = get_or_create_match_for_pair(db, from_profile_id, to_profile_id)
        matched = True
        match_id = match.id

    db.commit()

    # Notification triggers (task 0012 integration step -- B7's
    # notify_new_like/notify_new_match upgraded in place, not called by
    # anything until now). A mutual like notifies both matched profiles
    # about the match instead of also sending a separate "new like" to the
    # recipient -- the match is the more relevant event once it happens.
    # Both calls are internally defensive (never raise), but this fire-and
    # -forget dispatch is wrapped anyway so a notification-layer regression
    # can never affect the like/match response just returned to the caller.
    try:
        if matched:
            notification_service.notify_new_match(from_profile_id, match_id, db=db)
            notification_service.notify_new_match(to_profile_id, match_id, db=db)
        else:
            notification_service.notify_new_like(to_profile_id, db=db)
    except Exception:  # pragma: no cover - defensive, see docstring above
        pass

    return LikeResult(like.id, matched, match_id)


def count_incoming_likes(db: Session, profile_id: uuid.UUID) -> int:
    """Count every like received by `profile_id` ("see who liked you" --
    task 0012, subtask B8). Used for the free-tier teaser response, which
    gets this count and nothing else -- no liker identity.
    """
    stmt = select(Like.id).where(Like.to_profile_id == profile_id)
    return len(db.execute(stmt).all())


def list_incoming_likes(db: Session, profile_id: uuid.UUID) -> list[tuple[Like, Profile]]:
    """List every like received by `profile_id`, newest first, each joined
    to the liker's `Profile` ("see who liked you" full-detail branch --
    Premium-gated at the route layer via `has_active_premium`, never
    here).
    """
    stmt = (
        select(Like, Profile)
        .join(Profile, Profile.id == Like.from_profile_id)
        .where(Like.to_profile_id == profile_id)
        .order_by(Like.created_at.desc())
    )
    return [tuple(row) for row in db.execute(stmt).all()]
