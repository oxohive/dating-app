"""Health check endpoint.

A real, working feature used by the CI smoke test and by infra health
checks (ALB/ECS target group, etc.).
"""
from __future__ import annotations

from fastapi import APIRouter

from packages.api.core.correlation_id import get_correlation_id
from packages.api.features.health.schemas import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    """Return service liveness plus the current request's correlation ID."""
    return HealthResponse(status="ok", correlation_id=get_correlation_id())
