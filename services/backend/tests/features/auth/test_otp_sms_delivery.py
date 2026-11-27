"""Tests for `send_otp_sms`'s Twilio -> TextBee -> log-only-stub fallback
chain (task 0019).

Mocks the Twilio client class and the `httpx.post` call the same way this
codebase's other external-provider tests mock their clients (see
`tests/features/notifications/test_notification_service.py`'s
`_FakeFcmClient`): a small recording fake swapped in via `monkeypatch`,
rather than a generic mocking library.
"""
from __future__ import annotations

import logging

import pytest

from packages.api.features.auth import otp_service


class _RecordingTwilioMessages:
    """Stand-in for `twilio.rest.Client.messages`."""

    def __init__(self, *, raise_on_create: bool = False) -> None:
        self.raise_on_create = raise_on_create
        self.calls: list[dict] = []

    def create(self, *, to: str, from_: str, body: str):
        self.calls.append({"to": to, "from_": from_, "body": body})
        if self.raise_on_create:
            raise RuntimeError("simulated Twilio failure")
        return object()


class _RecordingTwilioClient:
    """Stand-in for `twilio.rest.Client`, recording construction args."""

    #: Set by a test (via a small factory) before `send_otp_sms` runs.
    raise_on_create: bool = False
    #: The most recently constructed instance, for assertions.
    last_instance: _RecordingTwilioClient | None = None

    def __init__(self, api_key_sid: str, api_key_secret: str, account_sid: str) -> None:
        self.api_key_sid = api_key_sid
        self.api_key_secret = api_key_secret
        self.account_sid = account_sid
        self.messages = _RecordingTwilioMessages(raise_on_create=type(self).raise_on_create)
        type(self).last_instance = self


class _UnusedTwilioClient:
    """Stand-in that fails the test if Twilio is ever constructed --
    used for the "Twilio must be skipped, not attempted" case."""

    def __init__(self, *args, **kwargs) -> None:
        raise AssertionError("Twilio client must not be constructed when ACCOUNT_SID is unset")


class _RecordingHttpxPost:
    """Stand-in for `httpx.post`, recording calls and returning a fake
    2xx response, or raising if configured to simulate a failure."""

    def __init__(self, *, raise_error: bool = False) -> None:
        self.raise_error = raise_error
        self.calls: list[dict] = []

    def __call__(self, url: str, *, headers: dict, json: dict, timeout: float):
        self.calls.append({"url": url, "headers": headers, "json": json, "timeout": timeout})
        if self.raise_error:
            raise RuntimeError("simulated TextBee failure")
        return _FakeHttpxResponse()


class _FakeHttpxResponse:
    def raise_for_status(self) -> None:
        return None


class _FailingHttpxPost:
    """Fails the test if called at all -- used to assert TextBee was
    never reached."""

    def __call__(self, *args, **kwargs):
        raise AssertionError("TextBee must not be called")


@pytest.fixture(autouse=True)
def _clean_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for var in (
        "TWILIO_ACCOUNT_SID",
        "TWILIO_API_KEY_SID",
        "TWILIO_API_KEY_SECRET",
        "TWILIO_FROM_NUMBER",
        "TEXTBEE_API_KEY",
        "TEXTBEE_DEVICE_ID",
    ):
        monkeypatch.delenv(var, raising=False)
    _RecordingTwilioClient.raise_on_create = False
    _RecordingTwilioClient.last_instance = None


def _set_twilio_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("TWILIO_ACCOUNT_SID", "AC_fake_account_sid")
    monkeypatch.setenv("TWILIO_API_KEY_SID", "SK_fake_key_sid")
    monkeypatch.setenv("TWILIO_API_KEY_SECRET", "fake_key_secret")
    monkeypatch.setenv("TWILIO_FROM_NUMBER", "+17372508034")


def _set_textbee_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("TEXTBEE_API_KEY", "fake_textbee_api_key")
    monkeypatch.setenv("TEXTBEE_DEVICE_ID", "fake_device_id")


# --- Twilio succeeds --------------------------------------------------------


def test_twilio_succeeds_textbee_and_stub_not_invoked(
    monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    _set_twilio_env(monkeypatch)
    _set_textbee_env(monkeypatch)  # configured, but must not be reached
    monkeypatch.setattr(otp_service, "TwilioClient", _RecordingTwilioClient)
    monkeypatch.setattr(otp_service.httpx, "post", _FailingHttpxPost())

    with caplog.at_level(logging.INFO):
        otp_service.send_otp_sms("+15551234567", "123456")

    instance = _RecordingTwilioClient.last_instance
    assert instance is not None
    assert instance.api_key_sid == "SK_fake_key_sid"
    assert instance.api_key_secret == "fake_key_secret"
    assert instance.account_sid == "AC_fake_account_sid"
    assert instance.messages.calls == [
        {
            "to": "+15551234567",
            "from_": "+17372508034",
            "body": "Your verification code is 123456",
        }
    ]
    assert any(r.message == "otp_sms_twilio_sent" for r in caplog.records)
    assert not any(r.message == "otp_sms_textbee_sent" for r in caplog.records)
    assert not any(r.message == "otp_sms_stub_fallback" for r in caplog.records)


# --- TWILIO_ACCOUNT_SID unset -----------------------------------------------


def test_account_sid_unset_skips_straight_to_textbee(
    monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    # TWILIO_ACCOUNT_SID intentionally left unset by the autouse fixture --
    # this is today's real deployed state (no SSM parameter for it yet).
    _set_textbee_env(monkeypatch)
    monkeypatch.setattr(otp_service, "TwilioClient", _UnusedTwilioClient)
    fake_post = _RecordingHttpxPost()
    monkeypatch.setattr(otp_service.httpx, "post", fake_post)

    with caplog.at_level(logging.INFO):
        otp_service.send_otp_sms("+15551234567", "654321")

    assert len(fake_post.calls) == 1
    call = fake_post.calls[0]
    assert call["url"] == otp_service.TEXTBEE_SEND_SMS_URL
    assert call["headers"]["x-api-key"] == "fake_textbee_api_key"
    assert call["json"]["recipients"] == ["+15551234567"]
    assert call["json"]["deviceId"] == "fake_device_id"
    assert "654321" in call["json"]["message"]
    assert any(r.message == "otp_sms_twilio_skipped_no_account_sid" for r in caplog.records)
    assert any(r.message == "otp_sms_textbee_sent" for r in caplog.records)


# --- Twilio raises -----------------------------------------------------------


def test_twilio_raises_falls_through_to_textbee(
    monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    _set_twilio_env(monkeypatch)
    _set_textbee_env(monkeypatch)
    _RecordingTwilioClient.raise_on_create = True
    monkeypatch.setattr(otp_service, "TwilioClient", _RecordingTwilioClient)
    fake_post = _RecordingHttpxPost()
    monkeypatch.setattr(otp_service.httpx, "post", fake_post)

    with caplog.at_level(logging.INFO):
        otp_service.send_otp_sms("+15551234567", "111111")

    assert len(fake_post.calls) == 1
    assert "111111" in fake_post.calls[0]["json"]["message"]
    assert any(r.message == "otp_sms_twilio_failed" for r in caplog.records)
    assert any(r.message == "otp_sms_textbee_sent" for r in caplog.records)


# --- Both Twilio and TextBee fail -------------------------------------------


def test_both_providers_fail_falls_to_stub_and_does_not_raise(
    monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    _set_twilio_env(monkeypatch)
    _set_textbee_env(monkeypatch)
    _RecordingTwilioClient.raise_on_create = True
    monkeypatch.setattr(otp_service, "TwilioClient", _RecordingTwilioClient)
    monkeypatch.setattr(otp_service.httpx, "post", _RecordingHttpxPost(raise_error=True))

    with caplog.at_level(logging.INFO):
        otp_service.send_otp_sms("+15551234567", "999999")  # must not raise

    assert any(r.message == "otp_sms_twilio_failed" for r in caplog.records)
    assert any(r.message == "otp_sms_textbee_failed" for r in caplog.records)
    stub_records = [r for r in caplog.records if r.message == "otp_sms_stub_fallback"]
    assert len(stub_records) == 1
    assert stub_records[0].phone_number == "+15551234567"
    assert stub_records[0].otp_code == "999999"


# --- Neither provider configured (today's default local/test state) -------


def test_neither_provider_configured_falls_to_stub(
    caplog: pytest.LogCaptureFixture,
) -> None:
    with caplog.at_level(logging.INFO):
        otp_service.send_otp_sms("+15559999999", "222222")

    assert any(r.message == "otp_sms_twilio_skipped_no_account_sid" for r in caplog.records)
    assert any(r.message == "otp_sms_textbee_skipped_not_configured" for r in caplog.records)
    stub_records = [r for r in caplog.records if r.message == "otp_sms_stub_fallback"]
    assert len(stub_records) == 1
    assert stub_records[0].phone_number == "+15559999999"
    assert stub_records[0].otp_code == "222222"
