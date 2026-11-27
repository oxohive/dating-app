"""Admin service: user search, report review, suspend actions, verification
review queue, and read-only subscription/payment monitoring.

Imports `User` from `auth.models` and `Profile` from `profiles.models` to
join/query them (per the plan's cross-feature-model-import rule) — never
redefines either. Owns no tables itself; `Report` is imported read/write
from `safety.models` (owned by this same subtask, B3). `Verification` is
imported read/write from `verification.models` (B6) for the review queue.
`Subscription`/`Payment` are imported **read-only** from
`subscriptions.models` (B4) for the admin monitoring endpoints added in
task 0010's integration step — admin never writes to either table.
"""
from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from packages.api.features.auth.models import User
from packages.api.features.profiles.models import Profile
from packages.api.features.safety.models import Report
from packages.api.features.subscriptions.models import Payment, Subscription
from packages.api.features.verification.models import (
    STATUS_APPROVED,
    STATUS_PENDING,
    STATUS_REJECTED,
    Verification,
)

RESOLVED_STATUS = "resolved"
_VALID_REVIEW_DECISIONS = {"approve": STATUS_APPROVED, "reject": STATUS_REJECTED}


def search_users(db: Session, query: str | None) -> list[tuple[User, Profile | None]]:
    """Search users by phone number or display name (case-insensitive substring)."""
    stmt = select(User, Profile).outerjoin(Profile, Profile.user_id == User.id)
    if query:
        pattern = f"%{query}%"
        stmt = stmt.where(
            or_(User.phone_number.ilike(pattern), Profile.display_name.ilike(pattern))
        )
    stmt = stmt.order_by(User.created_at.desc())
    return [tuple(row) for row in db.execute(stmt).all()]


def suspend_user(db: Session, user_id: uuid.UUID) -> User:
    """Set `User.is_active = False`. Raises 404 if the user doesn't exist."""
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.is_active = False
    db.commit()
    db.refresh(user)
    return user


def list_reports(db: Session, report_status: str) -> list[Report]:
    """List reports filtered by status (e.g. "open")."""
    stmt = select(Report).where(Report.status == report_status).order_by(Report.created_at.desc())
    return list(db.scalars(stmt).all())


def resolve_report(db: Session, report_id: uuid.UUID, action: str) -> Report:
    """Resolve a report: set status to "resolved" and append `action` to its audit trail.

    The shared `reports` schema has no dedicated action/resolution column
    (see plan.md), so the moderator's free-text `action` is appended to
    `Report.details` as an audit note rather than dropped. Raises 404 if
    the report doesn't exist.
    """
    report = db.get(Report, report_id)
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    audit_note = f"[resolved: action={action}]"
    report.details = f"{report.details}\n{audit_note}" if report.details else audit_note
    report.status = RESOLVED_STATUS
    db.commit()
    db.refresh(report)
    return report


def list_verifications(db: Session, status_filter: str) -> list[tuple[Verification, Profile]]:
    """List verifications, joined to each profile (for `display_name`),
    filtered by `status_filter` -- or every row, regardless of status, when
    `status_filter == "all"`.

    Ordering differs by intent: the `"pending"` case (the default, and the
    original `/verifications/pending` behavior this generalizes) orders
    oldest-first (`created_at.asc()`), since a review queue should be
    worked in submission order. Every other filter (`"approved"`,
    `"rejected"`, `"all"`) orders newest-first (`created_at.desc()`), which
    reads more naturally as a review-history view.

    `Verification` is imported from `verification.models` (owned by B6, this
    same subtask) rather than redefined here, per the plan's cross-feature-
    model-import rule -- `admin` only extends with a review-queue endpoint,
    it does not own the `verifications` table.
    """
    stmt = select(Verification, Profile).join(Profile, Profile.id == Verification.profile_id)
    if status_filter != "all":
        stmt = stmt.where(Verification.status == status_filter)

    if status_filter == STATUS_PENDING:
        stmt = stmt.order_by(Verification.created_at.asc())
    else:
        stmt = stmt.order_by(Verification.created_at.desc())

    return [tuple(row) for row in db.execute(stmt).all()]


def review_verification(
    db: Session, verification_id: uuid.UUID, decision: str, acting_admin: User
) -> tuple[Verification, Profile]:
    """Approve or reject a verification, recording who reviewed it and when.

    `reviewed_by_user_id` is always the *acting admin* (`acting_admin.id`,
    resolved server-side from the authenticated session via `require_admin`)
    and `reviewed_at` is always set here, server-side -- never accepted as
    client input, so the submitting user (or anyone else) cannot set either
    field directly. Raises 404 if the verification doesn't exist, 400 if
    `decision` isn't one of `approve`/`reject`.
    """
    if decision not in _VALID_REVIEW_DECISIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"decision must be one of {sorted(_VALID_REVIEW_DECISIONS)}",
        )

    verification = db.get(Verification, verification_id)
    if verification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Verification not found"
        )

    verification.status = _VALID_REVIEW_DECISIONS[decision]
    verification.reviewed_by_user_id = acting_admin.id
    verification.reviewed_at = datetime.now(UTC)
    db.commit()
    db.refresh(verification)

    profile = db.get(Profile, verification.profile_id)
    return verification, profile


def list_subscriptions(db: Session, status_filter: str) -> list[Subscription]:
    """List subscriptions for admin monitoring, filtered by `status_filter`
    (`"active"` | `"expired"` | `"cancelled"`), or every row when
    `status_filter == "all"` (the default -- see `routes.get_subscriptions`).

    `Subscription` is imported read-only from `subscriptions.models` (B4)
    per the plan's cross-feature-model-import rule -- `admin` never writes
    to this table, only lists it for monitoring. Ordered newest-first,
    matching `GET /admin/payments`.
    """
    stmt = select(Subscription)
    if status_filter != "all":
        stmt = stmt.where(Subscription.status == status_filter)
    stmt = stmt.order_by(Subscription.created_at.desc())
    return list(db.scalars(stmt).all())


def list_payments(db: Session, status_filter: str) -> list[Payment]:
    """List payments for admin monitoring, filtered by `status_filter`
    (`"pending"` | `"succeeded"` | `"failed"` | `"refunded"`), or every row
    when `status_filter == "all"` (the default -- see `routes.get_payments`).

    `Payment` is imported read-only from `subscriptions.models` (B4) per the
    plan's cross-feature-model-import rule -- `admin` never writes to this
    table, only lists it for monitoring. Ordered newest-first.
    """
    stmt = select(Payment)
    if status_filter != "all":
        stmt = stmt.where(Payment.status == status_filter)
    stmt = stmt.order_by(Payment.created_at.desc())
    return list(db.scalars(stmt).all())
