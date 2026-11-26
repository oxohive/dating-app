"""Discovery ORM models: Pass.

A `Pass` records that `from_profile_id` skipped `to_profile_id` in the
discovery feed, so it is never shown to that profile again. Recording a
pass is idempotent at the service layer (see `discovery_service.record_pass`),
backed by the unique constraint below so a duplicate pass never produces two
rows or an error.
"""
from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, Uuid
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.schema import UniqueConstraint

from packages.api.core.database import Base


class Pass(Base):
    """A profile passing on (skipping) another profile in discovery."""

    __tablename__ = "passes"
    __table_args__ = (
        UniqueConstraint("from_profile_id", "to_profile_id", name="uq_passes_from_to"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    from_profile_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("profiles.id"), nullable=False, index=True
    )
    to_profile_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("profiles.id"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
