"""Notification service: decide when/what to notify users about.

Covers events like new like, new match, new message, dispatching via
workers/notification_tasks.py + fcm_client.py once real push delivery is
wired up.

**Stub notice (this wave):** there is no FCM server key / device-token
registry yet, so this module does NOT call `fcm_client.FcmClient.send()`
(which deliberately raises `NotImplementedError`). Instead every function
below emits a structured log line describing the notification that would
have been sent. This is a documented, deliberate placeholder — not a bug —
so B2 (discovery/likes/matches) and other callers have a stable interface
to call today, with real push delivery dropped in behind the same function
signatures in a later wave without touching call sites.
"""
from __future__ import annotations

import logging
import uuid

logger = logging.getLogger(__name__)


def notify_new_like(profile_id: uuid.UUID) -> None:
    """Notify `profile_id` that someone liked them.

    Stub: structured log only. A real implementation would look up the
    profile's registered device token(s) and call `FcmClient.send(...)`.
    """
    logger.info(
        "notification.stub.new_like",
        extra={"event": "new_like", "profile_id": str(profile_id)},
    )


def notify_new_match(profile_id: uuid.UUID, match_id: uuid.UUID) -> None:
    """Notify `profile_id` that they have a new match.

    Stub: structured log only.
    """
    logger.info(
        "notification.stub.new_match",
        extra={
            "event": "new_match",
            "profile_id": str(profile_id),
            "match_id": str(match_id),
        },
    )


def notify_new_message(profile_id: uuid.UUID, message_id: uuid.UUID) -> None:
    """Notify `profile_id` that they received a new message.

    Stub: structured log only.
    """
    logger.info(
        "notification.stub.new_message",
        extra={
            "event": "new_message",
            "profile_id": str(profile_id),
            "message_id": str(message_id),
        },
    )
