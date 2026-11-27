"""Notification-preference get/update, and the enabled/disabled check
`notification_service.py` uses before dispatching each event type.
"""
from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from packages.api.features.notifications.constants import EVENT_PREFERENCE_FIELD
from packages.api.features.notifications.models import NotificationPreference

#: Columns a caller may update via `update_preferences`. Deliberately
#: excludes id/user_id/created_at/updated_at, and there is no
#: "security_alert" entry -- that event is never user-disable-able and has
#: no column at all (see `models.NotificationPreference`'s docstring).
UPDATABLE_FIELDS = (
    "new_like",
    "new_match",
    "new_message",
    "verification_result",
    "subscription_events",
)


def get_or_create_preferences(db: DbSession, user_id: uuid.UUID) -> NotificationPreference:
    """Return `user_id`'s preference row, creating one with the model's
    all-True defaults on first access if it doesn't exist yet."""
    preference = db.scalar(
        select(NotificationPreference).where(NotificationPreference.user_id == user_id)
    )
    if preference is not None:
        return preference

    preference = NotificationPreference(user_id=user_id)
    db.add(preference)
    db.commit()
    db.refresh(preference)
    return preference


def update_preferences(
    db: DbSession, user_id: uuid.UUID, updates: dict[str, Any]
) -> NotificationPreference:
    """Apply a partial update (only keys present in `updates`, which should
    already be filtered to non-`None`/explicitly-set values by the
    caller) to `user_id`'s preferences, creating the row first if needed.
    """
    preference = get_or_create_preferences(db, user_id)
    for field in UPDATABLE_FIELDS:
        if field in updates:
            setattr(preference, field, bool(updates[field]))
    db.commit()
    db.refresh(preference)
    return preference


def is_event_enabled(db: DbSession, user_id: uuid.UUID, event_type: str) -> bool:
    """Return whether `user_id` currently has `event_type` enabled.

    Security alerts (any event type mapped to `None` in
    `EVENT_PREFERENCE_FIELD`) are never user-disable-able -- always
    returns `True` without even querying the table.
    """
    field_name = EVENT_PREFERENCE_FIELD.get(event_type)
    if field_name is None:
        return True

    preference = db.scalar(
        select(NotificationPreference).where(NotificationPreference.user_id == user_id)
    )
    if preference is None:
        # No row yet == the model's column defaults == everything enabled.
        return True
    return bool(getattr(preference, field_name))
