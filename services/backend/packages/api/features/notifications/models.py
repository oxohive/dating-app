"""Notifications ORM models: PushToken, NotificationPreference.

This module OWNS the `push_tokens` and `notification_preferences` tables
(per the plan's cross-feature-model-import rule, other features must
import from here rather than redefine either class). `User` is imported
read-only from `features/auth/models.py` -- never redefined here.

Push tokens and preferences are modeled per-`user_id` (device-level), not
per-`profile_id` -- a user can have multiple devices/push tokens, and
preferences are a single row per account. `notification_service.py`
resolves `profile_id -> user_id` via `Profile.user_id` before touching
either table.

`PushToken.platform` is a plain `String` column (not a DB-level enum),
holding one of `"ios"` | `"android"` -- validated at the service layer
(see `push_token_service.ALLOWED_PLATFORMS`), the same convention already
used by every other feature in this codebase (e.g. `Subscription.plan`,
`Profile.gender`).

Security alerts are never user-disable-able -- there is deliberately no
`security_alert` column on `NotificationPreference`; `notification_service`
/`preferences_service` treat that event type as always-enabled regardless
of this table's contents.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from packages.api.core.database import Base


class PushToken(Base):
    """One registered device push token for a user."""

    __tablename__ = "push_tokens"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    token: Mapped[str] = mapped_column(String(512), nullable=False, unique=True, index=True)
    platform: Mapped[str] = mapped_column(String(16), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class NotificationPreference(Base):
    """One row per user: which notification event types they want pushed.

    Created lazily (with all-True defaults) the first time a user either
    reads or updates their preferences -- see
    `preferences_service.get_or_create_preferences`. A user who never
    touches this at all is treated as having every event type enabled
    (the column defaults), so a missing row and an all-True row behave
    identically to callers.
    """

    __tablename__ = "notification_preferences"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True, index=True
    )
    new_like: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    new_match: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    new_message: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    verification_result: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    subscription_events: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
