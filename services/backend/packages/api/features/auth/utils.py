"""Auth utility helpers: refresh-token hashing, JWT encode/decode.

JWT secret/algorithm are sourced from the existing `core.config.Settings`
(`jwt_secret_key`, `jwt_algorithm`) — no new settings fields are added
(core/ is out of scope for this subtask). Access/refresh token lifetimes are
local constants here rather than `settings.access_token_expire_minutes`
(which defaults to 60 and is core/config.py's existing field): the plan
calls for a short-lived ~30 min access token, and editing core/config.py is
out of scope for this subtask.
"""
from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt

from packages.api.core.config import get_settings

ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 30


def create_access_token(user_id: uuid.UUID) -> str:
    """Issue a short-lived JWT access token for `user_id`."""
    settings = get_settings()
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "type": "access",
        "iat": now,
        "exp": now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT access token.

    Raises `jwt.PyJWTError` (or a subclass, e.g. `ExpiredSignatureError`,
    `InvalidTokenError`) on any failure — callers (features/auth/dependencies.py)
    are responsible for translating that into an HTTP 401.
    """
    settings = get_settings()
    payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    if payload.get("type") != "access":
        raise jwt.InvalidTokenError("not an access token")
    return payload


def generate_refresh_token() -> str:
    """Generate a new opaque, high-entropy refresh token."""
    return secrets.token_urlsafe(48)


def hash_refresh_token(token: str) -> str:
    """Hash a refresh token for storage (never store the raw token)."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def refresh_token_expiry() -> datetime:
    """Return the expiry timestamp for a newly issued refresh token."""
    return datetime.now(UTC) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
