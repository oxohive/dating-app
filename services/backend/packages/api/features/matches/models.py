"""Match ORM models: Match.

A `Match` is always stored with the numerically/lexicographically smaller
UUID as `profile_a_id` (see `match_service._normalize_pair`), and is
enforced unique on the (profile_a_id, profile_b_id) pair. Together these
guarantee a mutual like can only ever create exactly one `matches` row for
a given pair of profiles, regardless of which direction's like landed
first or whether both arrive concurrently.
"""
from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Uuid
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.schema import UniqueConstraint

from packages.api.core.database import Base


class Match(Base):
    """A mutual-like match between two profiles."""

    __tablename__ = "matches"
    __table_args__ = (
        UniqueConstraint("profile_a_id", "profile_b_id", name="uq_matches_pair"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_a_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("profiles.id"), nullable=False, index=True
    )
    profile_b_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("profiles.id"), nullable=False, index=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
