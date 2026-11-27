"""Notification event-type constants.

Defined once here (per the plan's cross-feature contract notes) so every
caller -- this feature's own `notification_service.py` today, and the
integration step wiring `new_like`/`new_match`/`verification_result`/
`subscription_activated` call sites into other features in a later step
-- imports a single source of truth instead of inventing its own
event-type strings.

Only `EVENT_NEW_LIKE`, `EVENT_NEW_MATCH`, and `EVENT_NEW_MESSAGE` have a
live call site as of this wave: all three are upgraded in place inside
`notification_service.py`, and `EVENT_NEW_MESSAGE` is also already wired
from `messaging/message_service.py` (Wave 1). `EVENT_VERIFICATION_RESULT`,
`EVENT_SUBSCRIPTION_ACTIVATED`, and `EVENT_SECURITY_ALERT` are defined for
forward compatibility -- nothing in this feature calls
`notify_*`-style functions for them yet; that wiring is integration-step
-only, same as `new_like`/`new_match`.
"""
from __future__ import annotations

EVENT_NEW_LIKE = "new_like"
EVENT_NEW_MATCH = "new_match"
EVENT_NEW_MESSAGE = "new_message"
EVENT_VERIFICATION_RESULT = "verification_result"
EVENT_SUBSCRIPTION_ACTIVATED = "subscription_activated"
EVENT_SECURITY_ALERT = "security_alert"

#: Maps an event-type constant to the `NotificationPreference` boolean
#: column that gates it. A value of `None` means the event is never
#: user-disable-able -- currently only `EVENT_SECURITY_ALERT`, which
#: deliberately has no corresponding column on the model.
EVENT_PREFERENCE_FIELD: dict[str, str | None] = {
    EVENT_NEW_LIKE: "new_like",
    EVENT_NEW_MATCH: "new_match",
    EVENT_NEW_MESSAGE: "new_message",
    EVENT_VERIFICATION_RESULT: "verification_result",
    EVENT_SUBSCRIPTION_ACTIVATED: "subscription_events",
    EVENT_SECURITY_ALERT: None,
}
