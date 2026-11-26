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
from packages.api.features.admin.schemas import ReportAdminOut, ResolveReportRequest, UserAdminOut
from packages.api.features.auth.models import User

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
def suspend_user(user_id: uuid.UUID, db: DbSession, _admin: AdminUser) -> None:
    """Suspend a user by setting `is_active = False`."""
    admin_service.suspend_user(db, user_id)


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
    _admin: AdminUser,
) -> ReportAdminOut:
    """Resolve a report with a free-text moderator `action`."""
    report = admin_service.resolve_report(db, report_id, body.action)
    return ReportAdminOut.model_validate(report)
