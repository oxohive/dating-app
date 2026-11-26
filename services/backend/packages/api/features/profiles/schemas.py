"""Profile request/response schemas."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, computed_field, field_validator

from packages.api.features.profiles.validation import (
    validate_bio,
    validate_interests,
    validate_photo_position,
    validate_relationship_intention,
)


class PhotoOut(BaseModel):
    """A profile photo, as returned by every endpoint that exposes photos.

    `s3_key` is kept for internal/debugging consistency (it's what the
    photo endpoints were originally tested against), but every consumer
    (mobile, admin-web) should use the computed `url` field -- a resolved,
    directly-viewable URL built the same way across every endpoint that
    returns photos (see `photo_service.build_photo_url`).
    """

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    s3_key: str
    position: int
    is_primary: bool
    created_at: datetime

    @computed_field  # type: ignore[prop-decorator]
    @property
    def url(self) -> str:
        from packages.api.features.profiles.photo_service import build_photo_url

        return build_photo_url(self.s3_key)


class ProfileOut(BaseModel):
    """Full profile representation — only ever returned for the owner."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    display_name: str
    gender: str
    orientation_preferences: list[str]
    relationship_intention: str
    bio: str | None
    interests: list[str] | None
    city: str
    locality: str
    created_at: datetime
    updated_at: datetime
    photos: list[PhotoOut] = []


class ProfileUpdateIn(BaseModel):
    """Partial update — every field optional, only provided ones are applied."""

    display_name: str | None = None
    gender: str | None = None
    orientation_preferences: list[str] | None = None
    relationship_intention: str | None = None
    bio: str | None = None
    interests: list[str] | None = None
    city: str | None = None
    locality: str | None = None

    @field_validator("bio")
    @classmethod
    def _validate_bio(cls, value: str | None) -> str | None:
        return validate_bio(value)

    @field_validator("interests")
    @classmethod
    def _validate_interests(cls, value: list[str] | None) -> list[str] | None:
        return validate_interests(value)

    @field_validator("relationship_intention")
    @classmethod
    def _validate_relationship_intention(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return validate_relationship_intention(value)


class PublicProfileOut(BaseModel):
    """Public view of a profile — excludes phone_number/email/raw date_of_birth."""

    id: uuid.UUID
    display_name: str
    age: int | None
    gender: str
    bio: str | None
    interests: list[str] | None
    city: str
    locality: str
    photos: list[PhotoOut] = []


class PhotoPresignIn(BaseModel):
    content_type: str


class PhotoPresignOut(BaseModel):
    upload_url: str
    s3_key: str


class PhotoConfirmIn(BaseModel):
    s3_key: str
    position: int

    @field_validator("position")
    @classmethod
    def _validate_position(cls, value: int) -> int:
        return validate_photo_position(value)
