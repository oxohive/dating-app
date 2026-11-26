"""Admin request/response schemas."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class UserAdminOut(BaseModel):
    """A user row, as returned by `GET /admin/users`."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    phone_number: str
    display_name: str | None = None
    is_active: bool
    is_admin: bool
    created_at: datetime


class ReportAdminOut(BaseModel):
    """A report row, as returned by `GET /admin/reports`."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    reporter_profile_id: uuid.UUID
    reported_profile_id: uuid.UUID
    reason: str
    details: str | None
    status: str
    created_at: datetime


class ResolveReportRequest(BaseModel):
    """Body for `POST /admin/reports/{id}/resolve`.

    `action` is a free-text moderator decision (e.g. "warned", "banned",
    "dismissed"). The shared `reports` schema (plan.md) has no dedicated
    action/resolution column, so `action` is recorded as an audit note
    appended to `Report.details` and `Report.status` is set to
    `"resolved"` — see admin_service.resolve_report for the exact
    behaviour.
    """

    action: str = Field(min_length=1, max_length=64)
