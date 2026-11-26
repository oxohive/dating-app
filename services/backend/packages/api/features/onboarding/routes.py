"""Onboarding feature routes.

TODO(tasks/0004-auth-onboarding): implemented in tasks/0004-auth-onboarding.
This module currently exposes a single placeholder route (HTTP 501) so the
router mounts cleanly under its prefix and the app boots.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

router = APIRouter()


@router.post("/", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def post_onboarding_placeholder() -> None:
    """Placeholder. TODO(tasks/0004-auth-onboarding): implemented in tasks/0004-auth-onboarding."""
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Not implemented")
