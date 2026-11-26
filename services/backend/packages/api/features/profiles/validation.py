"""Profile input validation (bio length, interests count, photo position)."""
from __future__ import annotations

MAX_BIO_LENGTH = 500
MAX_INTERESTS = 20
VALID_RELATIONSHIP_INTENTIONS = {"serious", "casual", "open", "figuring_out"}


def validate_bio(value: str | None) -> str | None:
    if value is not None and len(value) > MAX_BIO_LENGTH:
        raise ValueError(f"bio must be at most {MAX_BIO_LENGTH} characters")
    return value


def validate_interests(value: list[str] | None) -> list[str] | None:
    if value is not None and len(value) > MAX_INTERESTS:
        raise ValueError(f"interests must have at most {MAX_INTERESTS} items")
    return value


def validate_relationship_intention(value: str) -> str:
    if value not in VALID_RELATIONSHIP_INTENTIONS:
        allowed = ", ".join(sorted(VALID_RELATIONSHIP_INTENTIONS))
        raise ValueError(f"relationship_intention must be one of: {allowed}")
    return value


def validate_photo_position(value: int) -> int:
    if value < 0:
        raise ValueError("position must be >= 0")
    return value
