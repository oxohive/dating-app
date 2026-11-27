"""Notifications feature routes.

`POST /push-tokens` (register/re-own a device push token), `DELETE
/push-tokens` (unregister one owned by the caller), `GET /preferences`
(the caller's notification preferences, created with the model's all-True
defaults on first read), and `PUT /preferences` (partial update). All four
are authenticated via `get_current_user` (push tokens/preferences are
per-`user_id`, device-level -- not per-`Profile`).

**Integration note:** this router is intentionally NOT mounted in
`main.py` -- wiring `app.include_router(notifications_router,
prefix="/notifications", tags=["notifications"])` into `main.py` is
integration-step-only this wave, since `main.py` is outside this feature's
owned paths (same convention `tests/features/subscriptions/conftest.py`
documents for its own not-yet-mounted router in a prior wave). Tests here
build a standalone app mounting only this router -- see
`tests/features/notifications/conftest.py`.
"""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DbSession

from packages.api.core.database import get_db
from packages.api.features.auth.dependencies import get_current_user
from packages.api.features.auth.models import User
from packages.api.features.notifications import preferences_service, push_token_service
from packages.api.features.notifications.schemas import (
    NotificationPreferenceOut,
    NotificationPreferenceUpdateRequest,
    PushTokenOut,
    PushTokenRegisterRequest,
    PushTokenUnregisterRequest,
)

router = APIRouter()

DbDependency = Annotated[DbSession, Depends(get_db)]
CurrentUserDependency = Annotated[User, Depends(get_current_user)]


@router.post("/push-tokens", response_model=PushTokenOut, status_code=status.HTTP_201_CREATED)
def post_push_token(
    body: PushTokenRegisterRequest, user: CurrentUserDependency, db: DbDependency
) -> PushTokenOut:
    """Register a device push token for the caller.

    If `body.token` was already registered (by this user or a different
    one -- e.g. a device reused after a reinstall under a new account),
    it is re-owned to the caller rather than erroring; see
    `push_token_service.register_token`.
    """
    try:
        push_token = push_token_service.register_token(db, user.id, body.token, body.platform)
    except push_token_service.InvalidPlatformError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return PushTokenOut.model_validate(push_token)


@router.delete("/push-tokens", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def delete_push_token(
    body: PushTokenUnregisterRequest, user: CurrentUserDependency, db: DbDependency
) -> None:
    """Unregister a device push token owned by the caller.

    404 if `body.token` doesn't exist or isn't owned by the caller (the
    two cases are indistinguishable to the client, by design -- never
    reveal that a token belongs to someone else).
    """
    deleted = push_token_service.unregister_token(db, user.id, body.token)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)


@router.get("/preferences", response_model=NotificationPreferenceOut)
def get_preferences(user: CurrentUserDependency, db: DbDependency) -> NotificationPreferenceOut:
    """Return the caller's notification preferences (all-True defaults if
    they've never set any)."""
    preference = preferences_service.get_or_create_preferences(db, user.id)
    return NotificationPreferenceOut.model_validate(preference)


@router.put("/preferences", response_model=NotificationPreferenceOut)
def put_preferences(
    body: NotificationPreferenceUpdateRequest, user: CurrentUserDependency, db: DbDependency
) -> NotificationPreferenceOut:
    """Partially update the caller's notification preferences.

    Security alerts are never represented here -- there is no column for
    them, by design (see `models.NotificationPreference`'s docstring) --
    so there is no way for a user to disable them via this endpoint.
    """
    preference = preferences_service.update_preferences(
        db, user.id, body.model_dump(exclude_unset=True)
    )
    return NotificationPreferenceOut.model_validate(preference)
