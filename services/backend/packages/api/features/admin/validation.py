"""Admin input validation helpers.

Authorization lives in `dependencies.require_admin`, not here — this module
is only for validating request *data*.
"""
from __future__ import annotations

from fastapi import HTTPException, status

MAX_QUERY_LENGTH = 200
ALLOWED_REPORT_STATUSES = {"open", "resolved"}


def validate_search_query(query: str | None) -> str | None:
    """Normalize/validate the `?query=` search term for `GET /admin/users`."""
    if query is None:
        return None
    query = query.strip()
    if not query:
        return None
    if len(query) > MAX_QUERY_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="query is too long"
        )
    return query


def validate_report_status(report_status: str) -> str:
    """Validate the `?status=` filter for `GET /admin/reports`."""
    if report_status not in ALLOWED_REPORT_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"status must be one of {sorted(ALLOWED_REPORT_STATUSES)}",
        )
    return report_status
