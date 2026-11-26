"""Quota service: enforce/consume daily like quota. Reset by workers/likes_quota_reset.py.

Daily like quota (20/day per profile) is computed, not persisted: it is a
live count of `Like` rows for the profile with `created_at >=` the start of
the *current UTC day*. This is a documented MVP simplification -- there is
no per-user timezone handling yet, so every profile's quota resets at UTC
midnight regardless of where they are (see
tasks/0008-mvp-feature-completion/plan.md, "Business rules").
"""
from __future__ import annotations

import uuid
from datetime import UTC, datetime, time, timedelta
from typing import TypedDict

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from packages.api.features.likes.models import Like

DAILY_LIKE_LIMIT = 20


class QuotaStatus(TypedDict):
    used: int
    limit: int
    resets_at: datetime


def _start_of_utc_day(now: datetime | None = None) -> datetime:
    now = now or datetime.now(UTC)
    return datetime.combine(now.date(), time.min, tzinfo=UTC)


def start_of_next_utc_day(now: datetime | None = None) -> datetime:
    """Return the UTC instant the current day's quota window resets at."""
    return _start_of_utc_day(now) + timedelta(days=1)


def count_used_today(db: Session, profile_id: uuid.UUID, now: datetime | None = None) -> int:
    """Count likes `profile_id` has sent since the start of the current UTC day."""
    start = _start_of_utc_day(now)
    stmt = select(func.count(Like.id)).where(
        Like.from_profile_id == profile_id, Like.created_at >= start
    )
    return int(db.execute(stmt).scalar_one())


def has_quota_remaining(db: Session, profile_id: uuid.UUID, now: datetime | None = None) -> bool:
    return count_used_today(db, profile_id, now) < DAILY_LIKE_LIMIT


def quota_status(db: Session, profile_id: uuid.UUID, now: datetime | None = None) -> QuotaStatus:
    used = count_used_today(db, profile_id, now)
    return {
        "used": used,
        "limit": DAILY_LIKE_LIMIT,
        "resets_at": start_of_next_utc_day(now),
    }
