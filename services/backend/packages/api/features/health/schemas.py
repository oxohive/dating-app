"""Response schemas for the health feature."""
from __future__ import annotations

from pydantic import BaseModel


class HealthResponse(BaseModel):
    """Payload returned by GET /health."""

    status: str
    correlation_id: str
