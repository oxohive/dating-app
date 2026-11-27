"""Admin service: user search, report review, suspend actions, verification
review queue, read-only subscription/payment monitoring, the payment-refund
workflow, the admin audit log, and read-only admin analytics.

Imports `User` from `auth.models` and `Profile` from `profiles.models` to
join/query them (per the plan's cross-feature-model-import rule) — never
redefines either. Owns the `admin_audit_log` table itself (see
`models.AdminAuditLog`); `Report` is imported read/write from
`safety.models` (owned by this same subtask, B3). `Verification` is
imported read/write from `verification.models` (B6) for the review queue.
`Subscription`/`Payment` are imported from `subscriptions.models` (B4) --
monitoring (`list_subscriptions`/`list_payments`) stays read-only, but
`refund_payment` (task 0012, subtask B8) is a deliberate, narrowly-scoped
exception: it writes `Payment.status` and, conditionally, `Subscription.status`,
per the refund-workflow contract in
`tasks/0012-wave3-engagement-and-lifecycle/plan.md`.

Admin analytics (task 0023, subtask B2, see this section at the bottom of
the module) imports `Like`/`Match`/`Message` read-only from their owning
modules purely to run `COUNT`/`GROUP BY` aggregates -- never mutates any of
them. **True DAU/WAU is explicitly out of scope for this wave**: it would
require a last-active-at / session-activity tracking mechanism that does
not exist anywhere in this codebase today, and approximating it with a
misleading proxy (e.g. "users created a row today") would be worse than
not showing it at all. This is a named, real future gap, not an oversight.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from packages.api.features.admin.models import AdminAuditLog
from packages.api.features.auth.models import User
from packages.api.features.likes.models import Like
from packages.api.features.matches.models import Match
from packages.api.features.messaging.models import Message
from packages.api.features.notifications import notification_service
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
REFUNDED_STATUS = "refunded"
ACTIVE_SUBSCRIPTION_STATUS = "active"
CANCELLED_SUBSCRIPTION_STATUS = "cancelled"
_VALID_REVIEW_DECISIONS = {"approve": STATUS_APPROVED, "reject": STATUS_REJECTED}

# Audit-log action names. Kept as plain string constants here (not an enum
# type) for the same reason every other status-ish column in this codebase
# avoids a DB enum -- see `subscriptions/models.py`'s docstring.
ACTION_SUSPEND_USER = "suspend_user"
ACTION_RESOLVE_REPORT = "resolve_report"
ACTION_REVIEW_VERIFICATION = "review_verification"
ACTION_REFUND_PAYMENT = "refund_payment"

TARGET_TYPE_USER = "user"
TARGET_TYPE_REPORT = "report"
TARGET_TYPE_VERIFICATION = "verification"
TARGET_TYPE_PAYMENT = "payment"


def record_admin_action(
    db: Session,
    admin_user_id: uuid.UUID,
    action: str,
    target_type: str,
    target_id: str,
) -> AdminAuditLog:
    """Append one row to the admin audit log.

    Deliberately does not commit -- callers add this to the same
    transaction as the action it's recording (via `db.add`/flush here,
    `db.commit()` there), so the audit entry and the action it describes
    are always persisted atomically together, never one without the
    other.
    """
    entry = AdminAuditLog(
        admin_user_id=admin_user_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
    )
    db.add(entry)
    return entry


def list_audit_log(db: Session, *, limit: int = 50, offset: int = 0) -> list[AdminAuditLog]:
    """List audit-log entries, newest first, for `GET /admin/audit-log`."""
    stmt = (
        select(AdminAuditLog)
        .order_by(AdminAuditLog.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    return list(db.scalars(stmt).all())


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


def suspend_user(db: Session, user_id: uuid.UUID, admin_user_id: uuid.UUID) -> User:
    """Set `User.is_active = False`. Raises 404 if the user doesn't exist."""
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.is_active = False
    record_admin_action(db, admin_user_id, ACTION_SUSPEND_USER, TARGET_TYPE_USER, str(user_id))
    db.commit()
    db.refresh(user)
    return user


def list_reports(db: Session, report_status: str) -> list[Report]:
    """List reports filtered by status (e.g. "open")."""
    stmt = select(Report).where(Report.status == report_status).order_by(Report.created_at.desc())
    return list(db.scalars(stmt).all())


def resolve_report(
    db: Session, report_id: uuid.UUID, action: str, admin_user_id: uuid.UUID
) -> Report:
    """Resolve a report: set status to "resolved" and append `action` to its audit trail.

    The shared `reports` schema has no dedicated action/resolution column
    (see plan.md), so the moderator's free-text `action` is appended to
    `Report.details` as an audit note rather than dropped. Raises 404 if
    the report doesn't exist. Also records this into the admin audit log
    (`AdminAuditLog`, task 0012 addition) -- distinct from the
    `Report.details` note above, which predates the audit log and stays
    as-is for backward compatibility.
    """
    report = db.get(Report, report_id)
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    audit_note = f"[resolved: action={action}]"
    report.details = f"{report.details}\n{audit_note}" if report.details else audit_note
    report.status = RESOLVED_STATUS
    record_admin_action(
        db, admin_user_id, ACTION_RESOLVE_REPORT, TARGET_TYPE_REPORT, str(report_id)
    )
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
    record_admin_action(
        db,
        acting_admin.id,
        ACTION_REVIEW_VERIFICATION,
        TARGET_TYPE_VERIFICATION,
        str(verification_id),
    )
    db.commit()
    db.refresh(verification)

    # Notification trigger (task 0012 integration step): tell the
    # submitting profile the outcome of their review. Defensive -- never
    # let a notification-layer failure affect the admin's review response.
    try:
        notification_service.notify_verification_result(
            verification.profile_id, decision == "approve", db=db
        )
    except Exception:  # pragma: no cover - defensive, see docstring above
        pass

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


def refund_payment(db: Session, payment_id: uuid.UUID, admin_user_id: uuid.UUID) -> Payment:
    """Refund a payment: `POST /admin/payments/{id}/refund`.

    Sets `Payment.status = "refunded"`. `Payment.subscription_id` (nullable
    FK) decides whether a subscription is also cancelled -- and if so,
    *which one*: always and only the specific subscription this payment's
    own `subscription_id` points to, never "the user's current
    subscription" generically (a user can have had multiple subscription
    rows over time -- see `subscriptions/models.py`). That linked
    subscription is cancelled only if it is still `status == "active"`;
    if `subscription_id` is null, or that subscription is already
    expired/cancelled, this is a normal no-op on the subscription side,
    not an error -- only the payment itself is marked refunded.

    Raises 404 if the payment doesn't exist. Records an `AdminAuditLog`
    entry for the refund in the same transaction.
    """
    payment = db.get(Payment, payment_id)
    if payment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")

    payment.status = REFUNDED_STATUS

    if payment.subscription_id is not None:
        subscription = db.get(Subscription, payment.subscription_id)
        if subscription is not None and subscription.status == ACTIVE_SUBSCRIPTION_STATUS:
            subscription.status = CANCELLED_SUBSCRIPTION_STATUS

    record_admin_action(
        db, admin_user_id, ACTION_REFUND_PAYMENT, TARGET_TYPE_PAYMENT, str(payment_id)
    )
    db.commit()
    db.refresh(payment)
    return payment


# --- Admin analytics (task 0023, subtask B2) --------------------------------
#
# Read-only aggregate queries backing `GET /admin/analytics`. Every count
# here is a single `COUNT`/`GROUP BY`-shaped query against existing tables
# -- none of this loops per-row/per-user, which matters in particular for
# `get_active_premium_count` (see its docstring: the same two conditions as
# `subscriptions_service.has_active_premium`, but as one aggregate query
# rather than one call per user).
#
# DAU/WAU is deliberately NOT implemented here -- see the module docstring.

REGISTRATION_WINDOW_DAYS = 30
ACTIVE_PREMIUM_STATUS = "active"


@dataclass(frozen=True)
class RegistrationDayCount:
    """One day's registration count, for the registrations-by-day series."""

    day: date
    count: int


@dataclass(frozen=True)
class CityCount:
    """One city's user count, for the users-by-city breakdown."""

    city: str
    count: int


@dataclass(frozen=True)
class AnalyticsSummary:
    """Everything `GET /admin/analytics` returns, assembled by `get_analytics`."""

    total_users: int
    total_profiles: int
    registrations_by_day: list[RegistrationDayCount]
    users_by_city: list[CityCount]
    total_likes: int
    total_matches: int
    total_messages: int
    active_premium_count: int


def _coerce_to_date(value: date | datetime | str) -> date:
    """Normalize a `func.date(...)` result to a plain `date`.

    `func.date()` maps to each dialect's own native `date()` SQL function
    (both SQLite and PostgreSQL have one), but the Python value that comes
    back differs by driver: PostgreSQL drivers typically hand back a real
    `date`/`datetime`, SQLite hands back an ISO-format string. Handling all
    three keeps `get_registrations_by_day` portable across both.
    """
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    return date.fromisoformat(str(value))


def get_total_users(db: Session) -> int:
    """Total `User` rows, regardless of `is_active`/`deleted_at`."""
    return db.scalar(select(func.count(User.id))) or 0


def get_total_profiles(db: Session) -> int:
    """Total `Profile` rows (i.e. completed onboarding)."""
    return db.scalar(select(func.count(Profile.id))) or 0


def get_total_likes(db: Session) -> int:
    """Total `Like` rows, a single `COUNT` -- `Like` imported read-only."""
    return db.scalar(select(func.count(Like.id))) or 0


def get_total_matches(db: Session) -> int:
    """Total `Match` rows, a single `COUNT` -- `Match` imported read-only."""
    return db.scalar(select(func.count(Match.id))) or 0


def get_total_messages(db: Session) -> int:
    """Total `Message` rows, a single `COUNT` -- `Message` imported read-only."""
    return db.scalar(select(func.count(Message.id))) or 0


def get_active_premium_count(db: Session) -> int:
    """Count of distinct users with a currently-active Premium subscription.

    Uses the **exact same two conditions** as
    `subscriptions_service.has_active_premium` (confirmed by reading that
    function directly, per plan.md): `Subscription.status == "active" AND
    Subscription.expires_at > now()`. This is one aggregate query
    (`COUNT(DISTINCT user_id)`), never a per-user loop calling
    `has_active_premium` -- that would be needlessly slow for an admin
    summary stat, and the plan explicitly calls this out.
    """
    now = datetime.now(UTC)
    stmt = select(func.count(func.distinct(Subscription.user_id))).where(
        Subscription.status == ACTIVE_PREMIUM_STATUS,
        Subscription.expires_at > now,
    )
    return db.scalar(stmt) or 0


def get_registrations_by_day(
    db: Session, *, days: int = REGISTRATION_WINDOW_DAYS
) -> list[RegistrationDayCount]:
    """Registrations per calendar day (UTC) for the last `days` days
    (inclusive of today), zero-filled for any day with no registrations.

    A single `COUNT`/`GROUP BY func.date(User.created_at)` query, not a
    per-day query loop. Zero-filling missing days makes the series a
    complete, chart-ready 30-point run rather than a sparse list the caller
    would have to reconstruct the calendar for themselves.
    """
    today = datetime.now(UTC).date()
    start_day = today - timedelta(days=days - 1)
    start_dt = datetime(start_day.year, start_day.month, start_day.day, tzinfo=UTC)

    stmt = (
        select(func.date(User.created_at), func.count(User.id))
        .where(User.created_at >= start_dt)
        .group_by(func.date(User.created_at))
    )
    counts_by_day = {_coerce_to_date(raw_day): count for raw_day, count in db.execute(stmt).all()}

    return [
        RegistrationDayCount(day=day, count=counts_by_day.get(day, 0))
        for day in (start_day + timedelta(days=offset) for offset in range(days))
    ]


def get_users_by_city(db: Session) -> list[CityCount]:
    """Every city with at least one `Profile`, with its user count.

    A single `COUNT`/`GROUP BY Profile.city` query, ordered by count
    descending (ties broken alphabetically by city, for a stable, readable
    order) -- all cities are returned, not just a top-N slice, since the
    expected cardinality (distinct cities) is small enough to render
    directly in admin-web's table per plan.md.
    """
    stmt = (
        select(Profile.city, func.count(Profile.id))
        .group_by(Profile.city)
        .order_by(func.count(Profile.id).desc(), Profile.city.asc())
    )
    return [CityCount(city=city, count=count) for city, count in db.execute(stmt).all()]


def get_analytics(db: Session) -> AnalyticsSummary:
    """Assemble the full `GET /admin/analytics` response.

    Every field here is backed by its own single aggregate query (see each
    helper above) -- this function does no additional querying of its own,
    it only composes their results.
    """
    return AnalyticsSummary(
        total_users=get_total_users(db),
        total_profiles=get_total_profiles(db),
        registrations_by_day=get_registrations_by_day(db),
        users_by_city=get_users_by_city(db),
        total_likes=get_total_likes(db),
        total_matches=get_total_matches(db),
        total_messages=get_total_messages(db),
        active_premium_count=get_active_premium_count(db),
    )
