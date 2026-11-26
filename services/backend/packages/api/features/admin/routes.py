"""Admin feature routes.

TODO: implement in a future tasks/ ticket (see tasks/ directory).
This module currently exposes a single placeholder route (HTTP 501) so the
router mounts cleanly under its prefix and the app boots.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

router = APIRouter()


@router.get("/users", status_code=status.HTTP_501_NOT_IMPLEMENTED)
def get_admin_placeholder() -> None:
    """Placeholder. TODO: implement in a future tasks/ ticket (see tasks/ directory)."""
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Not implemented")
