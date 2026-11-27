"""Admin feature routes.

Mounted at prefix `/admin` by `packages.api.main` (outside this subtask's
ownership) — this matches the plan's endpoint contract exactly
(`/admin/users`, `/admin/reports`), unlike messaging/safety's prefixes.

Every endpoint requires `require_admin` (see `dependencies.py`), which
itself requires `get_current_user` and checks `user.is_admin` — 403
otherwise.
"""
from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from packages.api.core.database import get_db
from packages.api.features.admin import admin_service, validation
from packages.api.features.admin.dependencies import require_admin
from packages.api.features.admin.schemas import (
    AdminAuditLogOut,
    PaymentAdminOut,
    ReportAdminOut,
    ResolveReportRequest,
    SubscriptionAdminOut,
    UserAdminOut,
    VerificationAdminOut,
    VerificationReviewRequest,
)
from packages.api.features.auth.models import User
from packages.api.features.verification.selfie_service import build_selfie_url

router = APIRouter()

DbSession = Annotated[Session, Depends(get_db)]
AdminUser = Annotated[User, Depends(require_admin)]


@router.get("/users", response_model=list[UserAdminOut])
def get_users(
    db: DbSession,
    _admin: AdminUser,
    query: Annotated[str | None, Query()] = None,
) -> list[UserAdminOut]:
    """Search users by phone number or display name."""
    cleaned_query = validation.validate_search_query(query)
    rows = admin_service.search_users(db, cleaned_query)
    return [
        UserAdminOut(
            id=user.id,
            phone_number=user.phone_number,
            display_name=profile.display_name if profile is not None else None,
            is_active=user.is_active,
            is_admin=user.is_admin,
            created_at=user.created_at,
        )
        for user, profile in rows
    ]


@router.post(
    "/users/{user_id}/suspend", status_code=status.HTTP_204_NO_CONTENT, response_model=None
)
def suspend_user(user_id: uuid.UUID, db: DbSession, admin: AdminUser) -> None:
    """Suspend a user by setting `is_active = False`."""
    admin_service.suspend_user(db, user_id, admin.id)


@router.get("/reports", response_model=list[ReportAdminOut])
def get_reports(
    db: DbSession,
    _admin: AdminUser,
    status_filter: Annotated[str, Query(alias="status")] = "open",
) -> list[ReportAdminOut]:
    """List reports, filtered by status (default "open")."""
    cleaned_status = validation.validate_report_status(status_filter)
    reports = admin_service.list_reports(db, cleaned_status)
    return [ReportAdminOut.model_validate(report) for report in reports]


@router.post("/reports/{report_id}/resolve", response_model=ReportAdminOut)
def resolve_report(
    report_id: uuid.UUID,
    body: ResolveReportRequest,
    db: DbSession,
    admin: AdminUser,
) -> ReportAdminOut:
    """Resolve a report with a free-text moderator `action`."""
    report = admin_service.resolve_report(db, report_id, body.action, admin.id)
    return ReportAdminOut.model_validate(report)


def _to_verification_admin_out(verification, profile) -> VerificationAdminOut:
    return VerificationAdminOut(
        id=verification.id,
        profile_id=verification.profile_id,
        display_name=profile.display_name,
        status=verification.status,
        selfie_url=build_selfie_url(verification.selfie_s3_key)
        if verification.selfie_s3_key
        else None,
        created_at=verification.created_at,
        reviewed_by_user_id=verification.reviewed_by_user_id,
        reviewed_at=verification.reviewed_at,
    )


@router.get("/verifications", response_model=list[VerificationAdminOut])
def get_verifications(
    db: DbSession,
    _admin: AdminUser,
    status_filter: Annotated[str, Query(alias="status")] = "pending",
) -> list[VerificationAdminOut]:
    """List profile-verification submissions, filtered by status (default
    "pending", preserving the exact observable behavior of the original
    `/verifications/pending` endpoint this generalizes). `?status=all`
    returns every submission regardless of status, for a review-history
    view.

    `selfie_url` is a resolved, directly-viewable presigned URL -- built via
    `verification.selfie_service.build_selfie_url`, the same URL-resolution
    helper pattern as `profiles.photo_service.build_photo_url`.
    """
    cleaned_status = validation.validate_verification_status(status_filter)
    rows = admin_service.list_verifications(db, cleaned_status)
    return [_to_verification_admin_out(verification, profile) for verification, profile in rows]


@router.post("/verifications/{verification_id}/review", response_model=VerificationAdminOut)
def review_verification(
    verification_id: uuid.UUID,
    body: VerificationReviewRequest,
    db: DbSession,
    admin: AdminUser,
) -> VerificationAdminOut:
    """Approve or reject a verification.

    `reviewed_by_user_id`/`reviewed_at` are always set server-side from the
    acting admin's authenticated identity -- never accepted from the
    request body, so the submitting user cannot set either directly.
    """
    verification, profile = admin_service.review_verification(
        db, verification_id, body.decision, admin
    )
    return _to_verification_admin_out(verification, profile)


@router.get("/subscriptions", response_model=list[SubscriptionAdminOut])
def get_subscriptions(
    db: DbSession,
    _admin: AdminUser,
    status_filter: Annotated[str, Query(alias="status")] = "all",
) -> list[SubscriptionAdminOut]:
    """List subscriptions for admin monitoring, filtered by status (default
    "all"). Read-only -- `admin` never mutates `Subscription` rows, only
    lists them (imported from `subscriptions.models`, owned by B4).
    """
    cleaned_status = validation.validate_subscription_status(status_filter)
    subscriptions = admin_service.list_subscriptions(db, cleaned_status)
    return [SubscriptionAdminOut.model_validate(subscription) for subscription in subscriptions]


@router.get("/payments", response_model=list[PaymentAdminOut])
def get_payments(
    db: DbSession,
    _admin: AdminUser,
    status_filter: Annotated[str, Query(alias="status")] = "all",
) -> list[PaymentAdminOut]:
    """List payments for admin monitoring, filtered by status (default
    "all"). Read-only -- `admin` never mutates `Payment` rows, only lists
    them (imported from `subscriptions.models`, owned by B4).
    """
    cleaned_status = validation.validate_payment_status(status_filter)
    payments = admin_service.list_payments(db, cleaned_status)
    return [PaymentAdminOut.model_validate(payment) for payment in payments]


@router.post("/payments/{payment_id}/refund", response_model=PaymentAdminOut)
def refund_payment(
    payment_id: uuid.UUID,
    db: DbSession,
    admin: AdminUser,
) -> PaymentAdminOut:
    """Refund a payment, per task 0012's refund-workflow contract.

    See `admin_service.refund_payment` for exactly which subscription (if
    any) is also cancelled -- always and only the one this payment's own
    `subscription_id` points to, and only if it's still active. 404 if the
    payment doesn't exist.
    """
    payment = admin_service.refund_payment(db, payment_id, admin.id)
    return PaymentAdminOut.model_validate(payment)


@router.get("/audit-log", response_model=list[AdminAuditLogOut])
def get_audit_log(
    db: DbSession,
    _admin: AdminUser,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[AdminAuditLogOut]:
    """List admin audit-log entries, newest first (simple limit/offset
    pagination -- admin-web's audit view, task 0012, subtask W3).
    """
    rows = admin_service.list_audit_log(db, limit=limit, offset=offset)
    return [AdminAuditLogOut.model_validate(row) for row in rows]
