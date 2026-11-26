"""Onboarding request schemas."""
from __future__ import annotations

from datetime import date

from pydantic import BaseModel, field_validator

from packages.api.features.onboarding.validation import validate_date_of_birth
from packages.api.features.profiles.validation import (
    validate_bio,
    validate_interests,
    validate_relationship_intention,
)


class ProfileCreateIn(BaseModel):
    display_name: str
    date_of_birth: date
    gender: str
    orientation_preferences: list[str]
    relationship_intention: str
    city: str
    locality: str
    bio: str | None = None
    interests: list[str] | None = None

    @field_validator("date_of_birth")
    @classmethod
    def _validate_dob(cls, value: date) -> date:
        return validate_date_of_birth(value)

    @field_validator("relationship_intention")
    @classmethod
    def _validate_relationship_intention(cls, value: str) -> str:
        return validate_relationship_intention(value)

    @field_validator("bio")
    @classmethod
    def _validate_bio(cls, value: str | None) -> str | None:
        return validate_bio(value)

    @field_validator("interests")
    @classmethod
    def _validate_interests(cls, value: list[str] | None) -> list[str] | None:
        return validate_interests(value)
