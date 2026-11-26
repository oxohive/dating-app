"""Safety ORM models: Block, Report.

Bind to `packages.api.core.database.Base`. This module OWNS the `blocks`
and `reports` tables. Per the plan's cross-feature-model-import rule, other
features (notably discovery, subtask B2) that need to *query* `blocks` must
import `Block` from here rather than redefining it:

    from packages.api.features.safety.models import Block

Field names on `Block` are part of the shared contract and must not drift:
`blocker_profile_id`, `blocked_profile_id`, both FK `profiles.id`, unique
together.
"""
from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from packages.api.core.database import Base


def _utcnow() -> datetime:
    return datetime.now(UTC)


class Block(Base):
    """One profile blocking another. Directional; unique per ordered pair."""

    __tablename__ = "blocks"
    __table_args__ = (
        UniqueConstraint("blocker_profile_id", "blocked_profile_id", name="uq_blocks_pair"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    blocker_profile_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("profiles.id"), nullable=False, index=True
    )
    blocked_profile_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("profiles.id"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )


class Report(Base):
    """A safety report filed by one profile against another."""

    __tablename__ = "reports"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    reporter_profile_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("profiles.id"), nullable=False, index=True
    )
    reported_profile_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("profiles.id"), nullable=False, index=True
    )
    reason: Mapped[str] = mapped_column(String(64), nullable=False)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="open", nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )
