"""OTP service: generation, (stub) SMS delivery, Redis-backed verification.

Uses `settings.redis_url` (core/config.py, unmodified) to build a Redis
client. `send_otp_sms` is a deliberate, documented stub: there is no SMS
provider configured yet, so it logs the code via structured logging instead
of calling a real provider. Tests monkeypatch `get_redis_client` so no live
Redis instance is required to run the suite.
"""
from __future__ import annotations

import logging
import secrets
from functools import lru_cache

import redis

from packages.api.core.config import get_settings

logger = logging.getLogger(__name__)

OTP_TTL_SECONDS = 5 * 60
_OTP_KEY_PREFIX = "otp:"


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


def send_otp_sms(phone_number: str, code: str) -> None:
    """Stub SMS delivery: logs the code instead of calling a real provider.

    No SMS provider credentials exist yet (documented in the plan) — this
    is intentional, not a bug. Replace with a real provider call once one
    is provisioned.
    """
    logger.info(
        "otp_sms_stub_send",
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
    """Generate, store, and (stub-)deliver a fresh OTP for `phone_number`."""
    code = generate_otp_code()
    store_otp(phone_number, code)
    send_otp_sms(phone_number, code)
