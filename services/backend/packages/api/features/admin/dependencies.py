"""Admin authorization dependency.

Every admin endpoint must require authentication (`get_current_user`) AND
check `user.is_admin`. `require_admin` is the single reusable place that
enforces both so routes never repeat the check inline.
"""
from __future__ import annotations

from typing import Annotated

from fastapi import Depends, HTTPException, status

from packages.api.features.auth.dependencies import get_current_user
from packages.api.features.auth.models import User


def require_admin(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    """FastAPI dependency: 403s unless the authenticated user is an admin."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required"
        )
    return current_user
