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
    return LikeResult(like.id, matched, match_id)
