"""Admin input validation helpers.

Authorization lives in `dependencies.require_admin`, not here — this module
is only for validating request *data*.
"""
from __future__ import annotations

from fastapi import HTTPException, status

MAX_QUERY_LENGTH = 200
ALLOWED_REPORT_STATUSES = {"open", "resolved"}
ALLOWED_VERIFICATION_STATUSES = {"pending", "approved", "rejected", "all"}
ALLOWED_SUBSCRIPTION_STATUSES = {"active", "expired", "cancelled", "all"}
ALLOWED_PAYMENT_STATUSES = {"pending", "succeeded", "failed", "refunded", "all"}


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


def validate_verification_status(verification_status: str) -> str:
    """Validate the `?status=` filter for `GET /admin/verifications`."""
    if verification_status not in ALLOWED_VERIFICATION_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"status must be one of {sorted(ALLOWED_VERIFICATION_STATUSES)}",
        )
    return verification_status


def validate_subscription_status(subscription_status: str) -> str:
    """Validate the `?status=` filter for `GET /admin/subscriptions`."""
    if subscription_status not in ALLOWED_SUBSCRIPTION_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"status must be one of {sorted(ALLOWED_SUBSCRIPTION_STATUSES)}",
        )
    return subscription_status


def validate_payment_status(payment_status: str) -> str:
    """Validate the `?status=` filter for `GET /admin/payments`."""
    if payment_status not in ALLOWED_PAYMENT_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"status must be one of {sorted(ALLOWED_PAYMENT_STATUSES)}",
        )
    return payment_status
