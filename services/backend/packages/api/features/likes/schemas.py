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
