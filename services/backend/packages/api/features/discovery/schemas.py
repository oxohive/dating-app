"""Discovery request/response schemas."""
from __future__ import annotations

import uuid

from pydantic import BaseModel


class DiscoveryProfileOut(BaseModel):
    """Public profile summary for a discovery feed item.

    Extends the original Profile-only field set with `age` (computed from
    the owning User's date_of_birth, never the raw DOB itself -- no User
    fields such as phone_number/email/date_of_birth are ever exposed) and
    `photo_urls` (resolved via `profiles.photo_service`, primary photo
    first) -- a swipeable card needs both to actually be usable. Built
    explicitly by `discovery_service.to_discovery_profile_out` rather than
    `model_validate`, since age/photo_urls aren't plain attributes of a
    `Profile` row.
    """

    id: uuid.UUID
    display_name: str
    age: int | None = None
    gender: str | None = None
    orientation_preferences: list[str] | None = None
    relationship_intention: str | None = None
    bio: str | None = None
    interests: list[str] | None = None
    city: str | None = None
    locality: str | None = None
    photo_urls: list[str] = []

    model_config = {"from_attributes": True}


class DiscoveryFeedResponse(BaseModel):
    profiles: list[DiscoveryProfileOut]
    next_offset: int


class DiscoveryPassRequest(BaseModel):
    to_profile_id: uuid.UUID
