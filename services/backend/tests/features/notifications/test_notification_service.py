"""Real tests for the notification service (Wave 3 / task 0012, B7
upgrade): `profile_id -> user_id` resolution, preference-gated delivery,
and graceful handling of FCM delivery failures.

Supersedes the Wave-1 stub tests that asserted `FcmClient.send` was never
called -- that was correct for the log-only stub, but is the opposite of
what the upgraded functions must now do.
"""
from __future__ import annotations

import logging
import uuid

import pytest
from sqlalchemy.orm import Session as DbSession

from packages.api.features.notifications import notification_service
from packages.api.features.notifications.models import NotificationPreference, PushToken
from packages.api.features.profiles.models import Profile

from .conftest import make_user_and_profile


class _FakeFcmClient:
    """Records every `send()` call instead of touching real FCM.

    Optionally raises, to exercise `notification_service`'s "a delivery
    failure must never propagate" requirement -- the real `FcmClient`
    already swallows its own errors (see `fcm_client.py`), but
    `notification_service` must be defensive even if a future caller
    somehow bypasses that.
    """

    def __init__(self, raise_on_send: bool = False) -> None:
        self.calls: list[tuple[str, str, str, dict[str, str] | None]] = []
        self.raise_on_send = raise_on_send

    def send(
        self, device_token: str, title: str, body: str, data: dict[str, str] | None = None
    ) -> str | None:
        self.calls.append((device_token, title, body, data))
        if self.raise_on_send:
            raise RuntimeError("simulated FCM delivery failure")
        return "fake-message-id"


@pytest.fixture
def fake_fcm(monkeypatch: pytest.MonkeyPatch) -> _FakeFcmClient:
    fake = _FakeFcmClient()
    monkeypatch.setattr(notification_service, "_fcm_client", fake)
    return fake


def _add_token(db: DbSession, profile: Profile, token: str = "token-abc") -> PushToken:
    push_token = PushToken(user_id=profile.user_id, token=token, platform="ios")
    db.add(push_token)
    db.commit()
    return push_token


# --- profile_id -> user_id resolution -------------------------------------


def test_notify_new_like_resolves_profile_id_to_user_id_and_sends(
    db: DbSession, fake_fcm: _FakeFcmClient
) -> None:
    profile = make_user_and_profile(db)
    other_profile = make_user_and_profile(db)
    _add_token(db, profile, token="recipient-token")
    _add_token(db, other_profile, token="someone-elses-token")

    notification_service.notify_new_like(profile.id, db=db)

    assert len(fake_fcm.calls) == 1
    device_token, _title, _body, _data = fake_fcm.calls[0]
    assert device_token == "recipient-token"  # only the right user's token, not the other's


def test_notify_new_like_unknown_profile_does_not_raise_and_does_not_send(
    db: DbSession, fake_fcm: _FakeFcmClient
) -> None:
    notification_service.notify_new_like(uuid.uuid4(), db=db)
    assert fake_fcm.calls == []


def test_notify_new_like_no_registered_token_does_not_send(
    db: DbSession, fake_fcm: _FakeFcmClient
) -> None:
    profile = make_user_and_profile(db)
    notification_service.notify_new_like(profile.id, db=db)
    assert fake_fcm.calls == []


# --- the three upgraded event functions actually call FcmClient.send -----


def test_notify_new_like_calls_fcm_send_when_enabled(
    db: DbSession, fake_fcm: _FakeFcmClient
) -> None:
    profile = make_user_and_profile(db)
    _add_token(db, profile)

    notification_service.notify_new_like(profile.id, db=db)

    assert len(fake_fcm.calls) == 1


def test_notify_new_match_calls_fcm_send_when_enabled(
    db: DbSession, fake_fcm: _FakeFcmClient
) -> None:
    profile = make_user_and_profile(db)
    _add_token(db, profile)
    match_id = uuid.uuid4()

    notification_service.notify_new_match(profile.id, match_id, db=db)

    assert len(fake_fcm.calls) == 1


def test_notify_new_message_calls_fcm_send_when_enabled(
    db: DbSession, fake_fcm: _FakeFcmClient
) -> None:
    profile = make_user_and_profile(db)
    _add_token(db, profile)
    message_id = uuid.uuid4()

    notification_service.notify_new_message(profile.id, message_id, db=db)

    assert len(fake_fcm.calls) == 1


# --- preference-gated delivery ---------------------------------------------


def test_notify_new_like_skips_send_when_preference_disabled(
    db: DbSession, fake_fcm: _FakeFcmClient
) -> None:
    profile = make_user_and_profile(db)
    _add_token(db, profile)
    db.add(NotificationPreference(user_id=profile.user_id, new_like=False))
    db.commit()

    notification_service.notify_new_like(profile.id, db=db)

    assert fake_fcm.calls == []


def test_notify_new_match_skips_send_when_preference_disabled(
    db: DbSession, fake_fcm: _FakeFcmClient
) -> None:
    profile = make_user_and_profile(db)
    _add_token(db, profile)
    db.add(NotificationPreference(user_id=profile.user_id, new_match=False))
    db.commit()

    notification_service.notify_new_match(profile.id, uuid.uuid4(), db=db)

    assert fake_fcm.calls == []


def test_notify_new_message_skips_send_when_preference_disabled(
    db: DbSession, fake_fcm: _FakeFcmClient
) -> None:
    profile = make_user_and_profile(db)
    _add_token(db, profile)
    db.add(NotificationPreference(user_id=profile.user_id, new_message=False))
    db.commit()

    notification_service.notify_new_message(profile.id, uuid.uuid4(), db=db)

    assert fake_fcm.calls == []


def test_notify_new_like_sends_when_other_preferences_disabled_but_new_like_enabled(
    db: DbSession, fake_fcm: _FakeFcmClient
) -> None:
    """Disabling unrelated event types must not affect new_like."""
    profile = make_user_and_profile(db)
    _add_token(db, profile)
    db.add(
        NotificationPreference(
            user_id=profile.user_id, new_match=False, new_message=False, new_like=True
        )
    )
    db.commit()

    notification_service.notify_new_like(profile.id, db=db)

    assert len(fake_fcm.calls) == 1


def test_no_preference_row_means_everything_enabled(
    db: DbSession, fake_fcm: _FakeFcmClient
) -> None:
    """A user who never touched their preferences has no row at all --
    must behave exactly like the all-True defaults, not like "disabled"."""
    profile = make_user_and_profile(db)
    _add_token(db, profile)
    assert db.query(NotificationPreference).count() == 0

    notification_service.notify_new_like(profile.id, db=db)

    assert len(fake_fcm.calls) == 1


# --- graceful handling of FCM send failures --------------------------------


def test_notify_new_like_fcm_failure_never_propagates(db: DbSession, monkeypatch) -> None:
    profile = make_user_and_profile(db)
    _add_token(db, profile)
    monkeypatch.setattr(
        notification_service, "_fcm_client", _FakeFcmClient(raise_on_send=True)
    )

    notification_service.notify_new_like(profile.id, db=db)  # must not raise


def test_notify_new_match_fcm_failure_never_propagates(db: DbSession, monkeypatch) -> None:
    profile = make_user_and_profile(db)
    _add_token(db, profile)
    monkeypatch.setattr(
        notification_service, "_fcm_client", _FakeFcmClient(raise_on_send=True)
    )

    notification_service.notify_new_match(profile.id, uuid.uuid4(), db=db)  # must not raise


def test_notify_new_message_fcm_failure_never_propagates(db: DbSession, monkeypatch) -> None:
    profile = make_user_and_profile(db)
    _add_token(db, profile)
    monkeypatch.setattr(
        notification_service, "_fcm_client", _FakeFcmClient(raise_on_send=True)
    )

    notification_service.notify_new_message(profile.id, uuid.uuid4(), db=db)  # must not raise


def test_notify_new_message_db_lookup_failure_never_propagates(
    db: DbSession, monkeypatch, caplog
) -> None:
    """Even a failure unrelated to FCM (e.g. the DB lookup itself) must not
    escape -- defense in depth for callers that don't wrap the call in
    their own try/except (unlike messaging/message_service.py's call
    site, which does)."""

    def _boom(*_args, **_kwargs):
        raise RuntimeError("simulated DB failure")

    monkeypatch.setattr(notification_service, "_resolve_user_id", _boom)

    with caplog.at_level(logging.ERROR):
        notification_service.notify_new_message(uuid.uuid4(), uuid.uuid4(), db=db)  # must not raise

    assert any(r.levelno >= logging.ERROR for r in caplog.records)


# --- real FcmClient, exercised against the sandbox credential -------------


def test_real_fcm_client_send_never_raises_against_sandbox_credential() -> None:
    """The real `FcmClient` (not the fake above) must swallow the expected
    failure to initialize against the placeholder/sandbox service-account
    credential (not a real Firebase project this wave) and return `None`
    rather than raising."""
    from packages.api.features.notifications.fcm_client import FcmClient

    result = FcmClient().send("some-device-token", "title", "body")
    assert result is None


# --- backward compatibility: messaging/message_service.py's call site ----


def test_notify_new_message_still_works_with_positional_args_only(
    db: DbSession, fake_fcm: _FakeFcmClient, monkeypatch
) -> None:
    """`messaging/message_service.py` calls
    `notify_new_message(recipient_profile_id, message.id)` -- two
    positional args, no `db` kwarg. That call must keep working exactly
    as before: this test calls it the same way (letting the function open
    its own session), pointed at an in-memory SQLite DB via a monkeypatched
    session factory so it doesn't try to reach a real Postgres instance.
    """
    profile = make_user_and_profile(db)
    _add_token(db, profile)
    db.commit()

    engine = db.get_bind()
    from sqlalchemy.orm import sessionmaker

    factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    monkeypatch.setattr(notification_service, "get_session_factory", lambda: factory)

    notification_service.notify_new_message(profile.id, uuid.uuid4())  # positional only, no db=

    assert len(fake_fcm.calls) == 1
