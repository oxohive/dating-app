"""Onboarding input validation (minimum age for the profile-creation step)."""
from __future__ import annotations

from datetime import UTC, date, datetime

MIN_AGE_YEARS = 18


def validate_date_of_birth(value: date) -> date:
    today = datetime.now(UTC).date()
    if value > today:
        raise ValueError("date_of_birth cannot be in the future")
    age = today.year - value.year - ((today.month, today.day) < (value.month, value.day))
    if age < MIN_AGE_YEARS:
        raise ValueError(f"must be at least {MIN_AGE_YEARS} years old")
    return value
