"""Device push-token registration/unregistration/lookup."""
from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from packages.api.features.notifications.models import PushToken

ALLOWED_PLATFORMS = ("ios", "android")


class InvalidPlatformError(ValueError):
    """Raised when `platform` is not one of `ALLOWED_PLATFORMS`."""


def register_token(db: DbSession, user_id: uuid.UUID, token: str, platform: str) -> PushToken:
    """Register `token` for `user_id`.

    `token` is globally unique (per `PushToken.token`'s DB constraint): if
    it was previously registered by a *different* user (e.g. a device
    reused after a reinstall under a new account), this re-owns the
    existing row to `user_id` rather than erroring, since the old owner
    can no longer receive pushes on that token anyway.
    """
    if platform not in ALLOWED_PLATFORMS:
        raise InvalidPlatformError(
            f"platform must be one of {ALLOWED_PLATFORMS!r}, got {platform!r}"
        )

    existing = db.scalar(select(PushToken).where(PushToken.token == token))
    if existing is not None:
        existing.user_id = user_id
        existing.platform = platform
        existing.updated_at = datetime.now(UTC)
        db.commit()
        db.refresh(existing)
        return existing

    push_token = PushToken(user_id=user_id, token=token, platform=platform)
    db.add(push_token)
    db.commit()
    db.refresh(push_token)
    return push_token


def unregister_token(db: DbSession, user_id: uuid.UUID, token: str) -> bool:
    """Delete `token` if it is owned by `user_id`.

    Returns whether a row was actually deleted (`False` if `token` doesn't
    exist, or exists but belongs to a different user -- the caller should
    treat that the same as "not found", never revealing whether the token
    belongs to someone else).
    """
    existing = db.scalar(
        select(PushToken).where(PushToken.token == token, PushToken.user_id == user_id)
    )
    if existing is None:
        return False
    db.delete(existing)
    db.commit()
    return True


def get_tokens_for_user(db: DbSession, user_id: uuid.UUID) -> list[PushToken]:
    """Return every push token currently registered for `user_id`."""
    return list(db.scalars(select(PushToken).where(PushToken.user_id == user_id)).all())
