"""Like ORM models: Like.

Daily like quota is *not* a separate persisted row/table in this wave — it
is computed on the fly by `quota_service.count_used_today`, which counts
`Like` rows for a profile with `created_at` on-or-after the start of the
current UTC day. This is a documented MVP simplification (see
tasks/0008-mvp-feature-completion/plan.md, "Business rules").
"""
from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, Uuid
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.schema import UniqueConstraint

from packages.api.core.database import Base


class Like(Base):
    """A profile liking another profile."""

    __tablename__ = "likes"
    __table_args__ = (
        UniqueConstraint("from_profile_id", "to_profile_id", name="uq_likes_from_to"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    from_profile_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("profiles.id"), nullable=False, index=True
    )
    to_profile_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("profiles.id"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False, index=True
    )
