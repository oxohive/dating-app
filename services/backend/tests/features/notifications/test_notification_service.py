"""Real tests for the notifications stub interface.

Verifies the documented stub behaviour: each function logs a structured
line and never raises / never touches `FcmClient` (which deliberately
raises `NotImplementedError` since no real FCM credentials exist yet).
"""
from __future__ import annotations

import logging
import uuid

from packages.api.features.notifications import notification_service

_LOGGER_NAME = "packages.api.features.notifications.notification_service"


def test_notify_new_like_logs_structured_event(caplog) -> None:
    profile_id = uuid.uuid4()
    with caplog.at_level(logging.INFO, logger=_LOGGER_NAME):
        notification_service.notify_new_like(profile_id)

    assert len(caplog.records) == 1
    record = caplog.records[0]
    assert record.event == "new_like"
    assert record.profile_id == str(profile_id)


def test_notify_new_match_logs_structured_event(caplog) -> None:
    profile_id = uuid.uuid4()
    match_id = uuid.uuid4()
    with caplog.at_level(logging.INFO, logger=_LOGGER_NAME):
        notification_service.notify_new_match(profile_id, match_id)

    record = caplog.records[0]
    assert record.event == "new_match"
    assert record.profile_id == str(profile_id)
    assert record.match_id == str(match_id)


def test_notify_new_message_logs_structured_event(caplog) -> None:
    profile_id = uuid.uuid4()
    message_id = uuid.uuid4()
    with caplog.at_level(logging.INFO, logger=_LOGGER_NAME):
        notification_service.notify_new_message(profile_id, message_id)

    record = caplog.records[0]
    assert record.event == "new_message"
    assert record.profile_id == str(profile_id)
    assert record.message_id == str(message_id)


def test_notification_service_never_calls_the_unimplemented_fcm_client(monkeypatch) -> None:
    """The stub must not attempt real delivery via FcmClient.send (NotImplementedError)."""
    from packages.api.features.notifications.fcm_client import FcmClient

    def _boom(self, *_args, **_kwargs):
        raise AssertionError("FcmClient.send should not be called by the stub")

    monkeypatch.setattr(FcmClient, "send", _boom)

    notification_service.notify_new_like(uuid.uuid4())
    notification_service.notify_new_match(uuid.uuid4(), uuid.uuid4())
    notification_service.notify_new_message(uuid.uuid4(), uuid.uuid4())
