"""Admin ORM models: AdminAuditLog.

This module OWNS the `admin_audit_log` table. It is a genuinely new
capability this wave (task 0012, subtask B8) -- confirmed by reading
`admin_service.py` in full that no audit-log mechanism existed anywhere
in this codebase before this addition.

`admin_user_id` is a plain FK to `users.id` (imported read-only
elsewhere via `features.auth.models.User`, never redefined here).
`action`/`target_type`/`target_id` are plain `String` columns (not a DB
enum), same convention as every other status-ish column in this
codebase (see `subscriptions/models.py`'s docstring for the rationale):
validated at the service layer, not via a Postgres ENUM, so new action
names never need a migration that alters a type. `target_id` is a
string rather than a `Uuid` column since not every admin action target
is necessarily a UUID-keyed row.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from packages.api.core.database import Base


class AdminAuditLog(Base):
    """One recorded admin action, for accountability/review.

    Append-only: nothing in this feature ever updates or deletes a row
    here once written.
    """

    __tablename__ = "admin_audit_log"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    admin_user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    target_type: Mapped[str] = mapped_column(String(32), nullable=False)
    target_id: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
