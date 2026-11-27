"""Like request/response schemas."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel


class LikeCreateRequest(BaseModel):
    to_profile_id: uuid.UUID


class LikeCreateResponse(BaseModel):
    like_id: uuid.UUID
    matched: bool
    match_id: uuid.UUID | None = None


class LikeQuotaResponse(BaseModel):
    used: int
    limit: int
    resets_at: datetime


class LikerProfileSummary(BaseModel):
    """A liker's public profile summary, shown only to Premium callers in
    the full-detail branch of `GET /likes/incoming`.
    """

    id: uuid.UUID
    display_name: str
    photo_url: str | None = None


class IncomingLikeItem(BaseModel):
    profile: LikerProfileSummary
    liked_at: datetime


class IncomingLikesResponse(BaseModel):
    """Response for `GET /likes/incoming` ("see who liked you").

    `is_premium` tells the client which branch it got. `count` is always
    populated (free and Premium alike). `likes` carries each liker's
    profile summary + like timestamp for Premium callers -- for free
    callers it is always `[]`: no liker's profile_id/display_name/photo
    is ever included in a free response, by design (see
    `docs/product-plan.md` Module 6).
    """

    is_premium: bool
    count: int
    likes: list[IncomingLikeItem] = []
