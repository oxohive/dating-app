"""Match service: create/list/unmatch logic.

Owns all mutation of the `matches` table. `likes.like_service` calls
`get_or_create_match_for_pair` here rather than writing to `matches`
itself -- discovery/likes/matches are all B2's own slice, so this is an
ordinary intra-subtask import, not a cross-subtask one.
"""
from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from packages.api.features.matches.models import Match


class NotAMatchParticipantError(Exception):
    """Raised when a profile tries to act on a match it isn't part of."""


def _normalize_pair(
    profile_x_id: uuid.UUID, profile_y_id: uuid.UUID
) -> tuple[uuid.UUID, uuid.UUID]:
    """Return (profile_a_id, profile_b_id) with the smaller UUID first.

    This normalization is what guarantees a pair of profiles is never
    stored both ways, so a mutual like can only ever create one match row.
    """
    if profile_x_id < profile_y_id:
        return profile_x_id, profile_y_id
    return profile_y_id, profile_x_id


def find_match_for_pair(
    db: Session, profile_x_id: uuid.UUID, profile_y_id: uuid.UUID
) -> Match | None:
    """Return the existing match for this pair of profiles, if any."""
    a, b = _normalize_pair(profile_x_id, profile_y_id)
    return db.execute(
        select(Match).where(Match.profile_a_id == a, Match.profile_b_id == b)
    ).scalar_one_or_none()


def get_or_create_match_for_pair(
    db: Session, profile_x_id: uuid.UUID, profile_y_id: uuid.UUID
) -> Match:
    """Return the single Match row for this pair, creating it if needed.

    Relies on the unique constraint on (profile_a_id, profile_b_id) to stay
    correct even if both directions of a mutual like race to create the
    match concurrently: the loser's insert raises IntegrityError, rolls
    back, and re-reads the winner's row instead of erroring.
    """
    a, b = _normalize_pair(profile_x_id, profile_y_id)
    existing = db.execute(
        select(Match).where(Match.profile_a_id == a, Match.profile_b_id == b)
    ).scalar_one_or_none()
    if existing is not None:
        return existing

    match = Match(profile_a_id=a, profile_b_id=b)
    db.add(match)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        existing = db.execute(
            select(Match).where(Match.profile_a_id == a, Match.profile_b_id == b)
        ).scalar_one_or_none()
        if existing is not None:
            return existing
        raise
    return match


def list_active_matches_for_profile(db: Session, profile_id: uuid.UUID) -> list[Match]:
    """Return every active match `profile_id` is a participant in, newest first."""
    stmt = (
        select(Match)
        .where(
            Match.is_active.is_(True),
            (Match.profile_a_id == profile_id) | (Match.profile_b_id == profile_id),
        )
        .order_by(Match.created_at.desc())
    )
    return list(db.execute(stmt).scalars())


def other_profile_id(match: Match, profile_id: uuid.UUID) -> uuid.UUID:
    """Return whichever side of the match `profile_id` is *not*."""
    return match.profile_b_id if match.profile_a_id == profile_id else match.profile_a_id


def unmatch(db: Session, match_id: uuid.UUID, profile_id: uuid.UUID) -> Match | None:
    """Set `is_active = False` on a match (never hard-deletes).

    Returns the match, or None if `match_id` doesn't exist. Raises
    NotAMatchParticipantError if `profile_id` isn't part of the match.
    """
    match = db.get(Match, match_id)
    if match is None:
        return None
    if profile_id not in (match.profile_a_id, match.profile_b_id):
        raise NotAMatchParticipantError("profile is not part of this match")
    match.is_active = False
    db.commit()
    return match
