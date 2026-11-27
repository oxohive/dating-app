"""Verification ORM model: Verification.

Binds to `packages.api.core.database.Base`. This module OWNS the
`verifications` table. Imports `Profile` from `profiles.models` and `User`
from `auth.models` to establish FKs (per the plan's cross-feature-model-
import rule) -- never redefines either.

Not Premium-gated: per `tasks/0010-wave2-deferred-features/plan.md`, the
only Premium-gated surface this wave is GPS discovery/radius and the
compatibility-insights breakdown. Verification is available to every user.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from packages.api.core.database import Base

STATUS_PENDING = "pending"
STATUS_APPROVED = "approved"
STATUS_REJECTED = "rejected"
VALID_STATUSES = {STATUS_PENDING, STATUS_APPROVED, STATUS_REJECTED}


class Verification(Base):
    """A profile's selfie-verification record (one-to-one with `Profile`)."""

    __tablename__ = "verifications"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    profile_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("profiles.id"), unique=True, nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(
        String(16), default=STATUS_PENDING, nullable=False, index=True
    )
    selfie_s3_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    reviewed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
