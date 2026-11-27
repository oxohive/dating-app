"""Admin request/response schemas."""
from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Literal

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


class VerificationAdminOut(BaseModel):
    """A verification row, as returned by `GET /admin/verifications/pending`
    and `POST /admin/verifications/{id}/review`.

    `selfie_url` is a resolved, directly-viewable presigned URL (never the
    bare `selfie_s3_key`) -- same URL-resolution helper pattern as
    `profiles.photo_service.build_photo_url`, via
    `verification.selfie_service.build_selfie_url`.
    """

    id: uuid.UUID
    profile_id: uuid.UUID
    display_name: str
    status: str
    selfie_url: str | None
    created_at: datetime
    reviewed_by_user_id: uuid.UUID | None
    reviewed_at: datetime | None


class VerificationReviewRequest(BaseModel):
    """Body for `POST /admin/verifications/{id}/review`."""

    decision: Literal["approve", "reject"]


class SubscriptionAdminOut(BaseModel):
    """A subscription row, as returned by `GET /admin/subscriptions`.

    Field names match the `Subscription` ORM exactly (admin-web's
    `SubscriptionAdminApiModel` already expects these snake_case keys) --
    this is a read-only monitoring view, never a mutation surface.
    """

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    plan: str
    status: str
    started_at: datetime
    expires_at: datetime
    created_at: datetime


class PaymentAdminOut(BaseModel):
    """A payment row, as returned by `GET /admin/payments`.

    Field names match the `Payment` ORM exactly (admin-web's
    `PaymentAdminApiModel` already expects these snake_case keys) -- this
    is a read-only monitoring view, never a mutation surface.
    """

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    subscription_id: uuid.UUID | None
    user_id: uuid.UUID
    provider: str
    provider_payment_id: str
    amount_minor_units: int
    currency: str
    status: str
    created_at: datetime


class AdminAuditLogOut(BaseModel):
    """One audit-log row, as returned by `GET /admin/audit-log`.

    Field names match the `AdminAuditLog` ORM exactly, same convention as
    `SubscriptionAdminOut`/`PaymentAdminOut`.
    """

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    admin_user_id: uuid.UUID
    action: str
    target_type: str
    target_id: str
    created_at: datetime


class RegistrationDayOut(BaseModel):
    """One day's registration count, as returned inside
    `GET /admin/analytics`'s `registrations_by_day` list.

    Zero-filled for days with no registrations (see
    `admin_service.get_registrations_by_day`) -- always exactly `days`
    consecutive calendar days (UTC), never a sparse list.
    """

    day: date
    count: int


class CityCountOut(BaseModel):
    """One city's user count, as returned inside `GET /admin/analytics`'s
    `users_by_city` list, ordered by count descending.
    """

    city: str
    count: int


class AdminAnalyticsOut(BaseModel):
    """Response for `GET /admin/analytics` (task 0023, subtask B2).

    Every count here comes from a single aggregate (`COUNT`/`GROUP BY`)
    query -- see `admin_service.get_analytics` and its helpers. Deliberately
    has no DAU/WAU field: true daily/weekly-active-user tracking needs a
    last-active-at/session-activity mechanism that doesn't exist in this
    codebase yet, and is out of scope for this wave (see
    `admin_service`'s module docstring) -- not an oversight.
    """

    total_users: int
    total_profiles: int
    registrations_by_day: list[RegistrationDayOut]
    users_by_city: list[CityCountOut]
    total_likes: int
    total_matches: int
    total_messages: int
    active_premium_count: int


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
