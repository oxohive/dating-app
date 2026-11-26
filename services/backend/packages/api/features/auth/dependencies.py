"""The ONE auth implementation every other backend subtask imports.

Exports `get_current_user` and `get_current_profile` as FastAPI
`Depends()`-compatible callables, per the plan's auth-dependency contract.
Every authenticated endpoint in every feature (including this one) should
depend on these rather than re-implementing JWT validation.
"""
from __future__ import annotations

import uuid
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from packages.api.core.database import get_db
from packages.api.features.auth.models import User
from packages.api.features.auth.utils import decode_access_token
from packages.api.features.profiles.models import Profile

_bearer_scheme = HTTPBearer(auto_error=False)

_CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer_scheme)],
    db: Annotated[DbSession, Depends(get_db)],
) -> User:
    """Resolve the authenticated `User` from a `Bearer <JWT>` access token."""
    if credentials is None or not credentials.credentials:
        raise _CREDENTIALS_EXCEPTION

    try:
        payload = decode_access_token(credentials.credentials)
    except jwt.PyJWTError as exc:
        raise _CREDENTIALS_EXCEPTION from exc

    raw_user_id = payload.get("sub")
    if raw_user_id is None:
        raise _CREDENTIALS_EXCEPTION

    try:
        user_id = uuid.UUID(raw_user_id)
    except (TypeError, ValueError) as exc:
        raise _CREDENTIALS_EXCEPTION from exc

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise _CREDENTIALS_EXCEPTION
    return user


def get_current_profile(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[DbSession, Depends(get_db)],
) -> Profile:
    """Resolve the authenticated user's `Profile`, or 404 if not onboarded."""
    profile = db.scalar(select(Profile).where(Profile.user_id == user.id))
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found"
        )
    return profile
