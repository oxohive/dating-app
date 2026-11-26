"""Safety request/response schemas."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class BlockCreate(BaseModel):
    """Body for `POST /blocks`."""

    profile_id: uuid.UUID


class ReportCreate(BaseModel):
    """Body for `POST /reports`."""

    profile_id: uuid.UUID
    reason: str = Field(min_length=1, max_length=64)
    details: str | None = Field(default=None, max_length=4000)


class ReportOut(BaseModel):
    """A report, as returned by `POST /reports`."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    reporter_profile_id: uuid.UUID
    reported_profile_id: uuid.UUID
    reason: str
    details: str | None
    status: str
    created_at: datetime
