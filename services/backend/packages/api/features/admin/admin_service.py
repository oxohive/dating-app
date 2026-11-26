"""Admin service: user search, report review, suspend actions.

Imports `User` from `auth.models` and `Profile` from `profiles.models` to
join/query them (per the plan's cross-feature-model-import rule) — never
redefines either. Owns no tables itself; `Report` is imported read/write
from `safety.models` (owned by this same subtask, B3).
"""
from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from packages.api.features.auth.models import User
from packages.api.features.profiles.models import Profile
from packages.api.features.safety.models import Report

RESOLVED_STATUS = "resolved"


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
