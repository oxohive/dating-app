"""Auth input validation (phone number format, OTP code format)."""
from __future__ import annotations

import re

PHONE_NUMBER_PATTERN = re.compile(r"^\+?[1-9]\d{7,14}$")
OTP_CODE_PATTERN = re.compile(r"^\d{6}$")


def normalize_phone_number(value: str) -> str:
    """Validate and normalize a phone number to E.164-ish `+<digits>` form.

    Raises ValueError if the value doesn't look like a plausible phone
    number. This is a deliberately loose check (MVP) — no carrier/region
    validation.
    """
    candidate = value.strip().replace(" ", "").replace("-", "")
    if not PHONE_NUMBER_PATTERN.match(candidate):
        raise ValueError("phone_number must be digits, 8-15 long, optionally prefixed with +")
    if not candidate.startswith("+"):
        candidate = f"+{candidate}"
    return candidate


def validate_otp_code(value: str) -> str:
    """Validate a 6-digit OTP code string."""
    if not OTP_CODE_PATTERN.match(value):
        raise ValueError("code must be exactly 6 digits")
    return value
