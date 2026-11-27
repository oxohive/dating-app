"""Notification feature request/response schemas: device push-token
register/unregister and notification-preference get/update.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel


class PushTokenRegisterRequest(BaseModel):
    """Body for `POST /push-tokens`."""

    token: str
    platform: str  # "ios" | "android" -- validated in push_token_service


class PushTokenUnregisterRequest(BaseModel):
    """Body for `DELETE /push-tokens`.

    Accepted as a JSON body rather than a path/query parameter because
    real device push tokens (e.g. Expo's `ExponentPushToken[...]` shape)
    can contain characters that are awkward in a URL path.
    """

    token: str


class PushTokenOut(BaseModel):
    id: uuid.UUID
    token: str
    platform: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class NotificationPreferenceOut(BaseModel):
    """Security alerts are deliberately absent -- never user-disable-able,
    not represented as a column anywhere (see
    `models.NotificationPreference`'s docstring)."""

    new_like: bool
    new_match: bool
    new_message: bool
    verification_result: bool
    subscription_events: bool
    updated_at: datetime

    model_config = {"from_attributes": True}


class NotificationPreferenceUpdateRequest(BaseModel):
    """Body for `PUT /preferences`. Partial update: only fields explicitly
    provided in the request are changed (`exclude_unset=True` is applied
    at the route layer before this reaches the service layer)."""

    new_like: bool | None = None
    new_match: bool | None = None
    new_message: bool | None = None
    verification_result: bool | None = None
    subscription_events: bool | None = None
