"""Notifications feature.

Push notification orchestration (`notification_service.py`, `fcm_client.py`)
plus HTTP routes (`routes.py`) for device push-token registration and
notification-preference management (`push_token_service.py`,
`preferences_service.py`).

Event-type constants are re-exported here for convenience -- e.g.
`from packages.api.features.notifications import EVENT_NEW_LIKE` -- the
canonical definitions live in `constants.py`, which callers may also
import directly (e.g. `from packages.api.features.notifications import
constants`).
"""
from __future__ import annotations

from packages.api.features.notifications.constants import (
    EVENT_NEW_LIKE,
    EVENT_NEW_MATCH,
    EVENT_NEW_MESSAGE,
    EVENT_SECURITY_ALERT,
    EVENT_SUBSCRIPTION_ACTIVATED,
    EVENT_VERIFICATION_RESULT,
)

__all__ = [
    "EVENT_NEW_LIKE",
    "EVENT_NEW_MATCH",
    "EVENT_NEW_MESSAGE",
    "EVENT_VERIFICATION_RESULT",
    "EVENT_SUBSCRIPTION_ACTIVATED",
    "EVENT_SECURITY_ALERT",
]
