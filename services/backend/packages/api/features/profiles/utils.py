"""Profile utility helpers (age computation, display-name formatting)."""
from __future__ import annotations

from datetime import UTC, date, datetime


def compute_age(date_of_birth: date | None) -> int | None:
    """Return the whole-years age for `date_of_birth` as of today (UTC)."""
    if date_of_birth is None:
        return None
    today = datetime.now(UTC).date()
    years = today.year - date_of_birth.year
    had_birthday_yet = (today.month, today.day) >= (date_of_birth.month, date_of_birth.day)
    if not had_birthday_yet:
        years -= 1
    return years


def format_display_name(value: str) -> str:
    """Trim and collapse whitespace in a display name."""
    return " ".join(value.strip().split())
