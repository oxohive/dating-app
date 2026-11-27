"""Auth service: OTP-backed login, token issuance/refresh, session revocation."""
from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from packages.api.features.auth.models import Session as SessionModel
from packages.api.features.auth.models import User
from packages.api.features.auth.otp_service import request_otp, verify_otp
from packages.api.features.auth.utils import (
    create_access_token,
    generate_refresh_token,
    hash_refresh_token,
    refresh_token_expiry,
)
from packages.api.features.profiles import profile_service


class InvalidOtpError(Exception):
    """Raised when an OTP code is missing, expired, or doesn't match."""


class InvalidRefreshTokenError(Exception):
    """Raised when a refresh token is unknown, revoked, or expired."""


def request_login_otp(phone_number: str) -> None:
    """Kick off the OTP request flow for `phone_number`."""
    request_otp(phone_number)


def _get_or_create_user(db: DbSession, phone_number: str) -> tuple[User, bool]:
    user = db.scalar(select(User).where(User.phone_number == phone_number))
    if user is not None:
        return user, False
    user = User(phone_number=phone_number)
    db.add(user)
    db.flush()
    return user, True


def _issue_session(db: DbSession, user: User) -> tuple[str, str]:
    """Create a new `Session` row and return (access_token, refresh_token)."""
    refresh_token = generate_refresh_token()
    session = SessionModel(
        user_id=user.id,
        refresh_token_hash=hash_refresh_token(refresh_token),
        expires_at=refresh_token_expiry(),
    )
    db.add(session)
    db.commit()
    access_token = create_access_token(user.id)
    return access_token, refresh_token


def verify_otp_and_login(
    db: DbSession, phone_number: str, code: str
) -> tuple[str, str, User, bool]:
    """Verify the OTP, find-or-create the user, and issue a token pair.

    Returns (access_token, refresh_token, user, is_new_user). Raises
    `InvalidOtpError` if the code is wrong/expired.
    """
    if not verify_otp(phone_number, code):
        raise InvalidOtpError("invalid or expired OTP code")

    user, is_new_user = _get_or_create_user(db, phone_number)
    access_token, refresh_token = _issue_session(db, user)
    return access_token, refresh_token, user, is_new_user


def refresh_tokens(db: DbSession, refresh_token: str) -> tuple[str, str]:
    """Validate `refresh_token`, rotate it, and return a new token pair.

    Raises `InvalidRefreshTokenError` if the token is unknown, revoked, or
    expired.
    """
    token_hash = hash_refresh_token(refresh_token)
    session = db.scalar(
        select(SessionModel).where(SessionModel.refresh_token_hash == token_hash)
    )
    now = datetime.now(UTC)
    expires_at = session.expires_at if session is not None else None
    if expires_at is not None and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)
    if (
        session is None
        or session.revoked_at is not None
        or expires_at is None
        or expires_at < now
    ):
        raise InvalidRefreshTokenError("invalid, revoked, or expired refresh token")

    session.revoked_at = now
    db.add(session)

    user = db.get(User, session.user_id)
    if user is None:
        raise InvalidRefreshTokenError("session has no owning user")

    access_token, new_refresh_token = _issue_session(db, user)
    return access_token, new_refresh_token


def logout(db: DbSession, refresh_token: str) -> None:
    """Revoke the session backing `refresh_token`, if any (idempotent)."""
    token_hash = hash_refresh_token(refresh_token)
    session = db.scalar(
        select(SessionModel).where(SessionModel.refresh_token_hash == token_hash)
    )
    if session is not None and session.revoked_at is None:
        session.revoked_at = datetime.now(UTC)
        db.add(session)
        db.commit()


def delete_account(db: DbSession, user: User) -> None:
    """Self-service, irreversible-from-the-user's-perspective account deletion.

    Sets `is_active = False` AND `deleted_at = now()` on `user` -- both
    fields, not just `is_active`, so this is distinguishable from an
    admin suspension (`admin_service.suspend_user`, which sets
    `is_active = False` only and leaves `deleted_at` `None`). Flipping
    `is_active` to `False` immediately invalidates every existing
    session/token for this user on their next request, since
    `auth.dependencies.get_current_user` already rejects `not
    user.is_active` -- no separate token-blacklist mechanism needed.

    Also scrubs PII (`display_name`/`bio`/`interests`) on the user's
    `Profile`, if one exists -- a user who deletes their account before
    completing onboarding has no `Profile` row yet, which is not an
    error. Does NOT delete `Match`/`Conversation`/`Message` rows.
    """
    user.is_active = False
    user.deleted_at = datetime.now(UTC)
    db.add(user)

    profile = profile_service.get_profile_by_user_id(db, user.id)
    if profile is not None:
        profile_service.scrub_profile_pii(db, profile)

    db.commit()
