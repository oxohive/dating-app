"""OTP service: generation, SMS delivery, Redis-backed verification.

Uses `settings.redis_url` (core/config.py, unmodified) to build a Redis
client. Tests monkeypatch `get_redis_client` so no live Redis instance is
required to run the suite.

`send_otp_sms` (task 0019) tries real SMS delivery before falling back to
the original log-only behavior, in this order:

  1. **Twilio** (primary) -- uses the official `twilio` package. Reads
     `TWILIO_API_KEY_SID` / `TWILIO_API_KEY_SECRET` / `TWILIO_ACCOUNT_SID` /
     `TWILIO_FROM_NUMBER` from env vars, empty-string defaults (no real
     secrets hardcoded here -- same convention as
     `subscriptions/payment_provider.py`'s `RAZORPAY_WEBHOOK_SECRET` /
     `notifications/fcm_client.py`'s `FCM_SERVICE_ACCOUNT_JSON`).
     `TWILIO_ACCOUNT_SID` currently has **no** SSM parameter provisioned
     (see `docs/runbooks/env-start-stop.md`), so it is unset in every
     deployed environment today; an unset/empty value means this stage is
     skipped entirely (not attempted) rather than making a call that can't
     succeed (Twilio's API requires the account SID alongside the API Key
     SID/Secret). Twilio activates automatically, with no code change,
     once that SSM parameter is added.
  2. **TextBee** (fallback) -- a phone-based SMS gateway
     (https://github.com/vernu/textbee), reached over plain `httpx` per
     its documented REST API (`POST
     https://api.textbee.dev/api/v1/gateway/send-sms`). This is a
     deliberate, **temporary, testing-only** measure (a personal phone
     acting as an SMS relay) -- not suitable for real production volume
     (single point of failure, carrier rate limits). Remove it once a
     durable SMS strategy is chosen; see `docs/runbooks/env-start-stop.md`.
  3. **Log-only stub** (final safety net) -- always runs if both providers
     above were skipped/unavailable/failed, so an OTP request can never
     fail just because every SMS provider is down. Still logs the actual
     OTP code at this stage, same as before task 0019, so testing via logs
     keeps working.

Every stage logs clearly (including the phone number) which path was
taken, so it's obvious from logs alone which path delivered (or didn't):
`otp_sms_twilio_sent` / `otp_sms_twilio_skipped_no_account_sid` /
`otp_sms_twilio_failed` / `otp_sms_textbee_sent` /
`otp_sms_textbee_skipped_not_configured` / `otp_sms_textbee_failed` /
`otp_sms_stub_fallback`. `send_otp_sms` itself never raises: a request/
verify endpoint must always succeed even if every SMS provider is down.
"""
from __future__ import annotations

import logging
import os
import secrets
from functools import lru_cache

import httpx
import redis
from twilio.rest import Client as TwilioClient

from packages.api.core.config import get_settings

logger = logging.getLogger(__name__)

OTP_TTL_SECONDS = 5 * 60
_OTP_KEY_PREFIX = "otp:"

# TextBee's documented gateway endpoint (github.com/vernu/textbee /
# textbee.dev/docs/sending-sms) -- confirmed against the live docs rather
# than guessed, since a wrong field name here would silently fail every
# send.
TEXTBEE_SEND_SMS_URL = "https://api.textbee.dev/api/v1/gateway/send-sms"
_HTTP_TIMEOUT_SECONDS = 10.0


@lru_cache
def get_redis_client() -> redis.Redis:
    """Return a process-wide cached Redis client bound to `settings.redis_url`."""
    settings = get_settings()
    return redis.Redis.from_url(settings.redis_url, decode_responses=True)


def _otp_key(phone_number: str) -> str:
    return f"{_OTP_KEY_PREFIX}{phone_number}"


def generate_otp_code() -> str:
    """Generate a 6-digit numeric OTP code."""
    return f"{secrets.randbelow(1_000_000):06d}"


def _send_via_twilio(phone_number: str, code: str) -> bool:
    """Try sending `code` to `phone_number` via Twilio. Returns True on
    success. Returns False (never raises) if Twilio is unconfigured
    (no `TWILIO_ACCOUNT_SID` yet) or if the API call itself fails."""
    account_sid = os.environ.get("TWILIO_ACCOUNT_SID", "")
    if not account_sid:
        logger.info(
            "otp_sms_twilio_skipped_no_account_sid",
            extra={"phone_number": phone_number},
        )
        return False

    api_key_sid = os.environ.get("TWILIO_API_KEY_SID", "")
    api_key_secret = os.environ.get("TWILIO_API_KEY_SECRET", "")
    from_number = os.environ.get("TWILIO_FROM_NUMBER", "")

    try:
        client = TwilioClient(api_key_sid, api_key_secret, account_sid)
        client.messages.create(
            to=phone_number,
            from_=from_number,
            body=f"Your verification code is {code}",
        )
    except Exception:
        logger.exception(
            "otp_sms_twilio_failed",
            extra={"phone_number": phone_number},
        )
        return False

    logger.info("otp_sms_twilio_sent", extra={"phone_number": phone_number})
    return True


def _send_via_textbee(phone_number: str, code: str) -> bool:
    """Try sending `code` to `phone_number` via TextBee. Returns True on
    success. Returns False (never raises) if TextBee is unconfigured or
    the HTTP call fails/returns a non-2xx response.

    TextBee is an intentional, temporary, testing-only fallback (a
    personal-phone SMS relay) -- see the module docstring and
    `docs/runbooks/env-start-stop.md`.
    """
    api_key = os.environ.get("TEXTBEE_API_KEY", "")
    device_id = os.environ.get("TEXTBEE_DEVICE_ID", "")
    if not api_key or not device_id:
        logger.info(
            "otp_sms_textbee_skipped_not_configured",
            extra={"phone_number": phone_number},
        )
        return False

    try:
        response = httpx.post(
            TEXTBEE_SEND_SMS_URL,
            headers={"x-api-key": api_key, "Content-Type": "application/json"},
            json={
                "recipients": [phone_number],
                "message": f"Your verification code is {code}",
                "deviceId": device_id,
            },
            timeout=_HTTP_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
    except Exception:
        logger.exception(
            "otp_sms_textbee_failed",
            extra={"phone_number": phone_number},
        )
        return False

    logger.info("otp_sms_textbee_sent", extra={"phone_number": phone_number})
    return True


def send_otp_sms(phone_number: str, code: str) -> None:
    """Deliver `code` to `phone_number`, trying Twilio, then TextBee, then
    the log-only stub. See the module docstring for the full rationale.

    Deliberately never raises: a delivery failure (or every provider
    being unconfigured) must never break the OTP request/verify flow.
    """
    if _send_via_twilio(phone_number, code):
        return
    if _send_via_textbee(phone_number, code):
        return

    logger.info(
        "otp_sms_stub_fallback",
        extra={"phone_number": phone_number, "otp_code": code},
    )


def store_otp(phone_number: str, code: str) -> None:
    """Store `code` for `phone_number` in Redis with a 5-minute TTL."""
    client = get_redis_client()
    client.setex(_otp_key(phone_number), OTP_TTL_SECONDS, code)


def verify_otp(phone_number: str, code: str) -> bool:
    """Check `code` against the stored OTP for `phone_number`.

    On success the OTP is deleted (single use). Returns False for a
    missing/expired/mismatched code.
    """
    client = get_redis_client()
    key = _otp_key(phone_number)
    stored = client.get(key)
    if stored is None or stored != code:
        return False
    client.delete(key)
    return True


def request_otp(phone_number: str) -> None:
    """Generate, store, and deliver a fresh OTP for `phone_number`."""
    code = generate_otp_code()
    store_otp(phone_number, code)
    send_otp_sms(phone_number, code)
