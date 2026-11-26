"""Discovery feature routes.

`GET /discovery/feed` and `POST /discovery/pass`, per the endpoint
contract in tasks/0008-mvp-feature-completion/plan.md.
"""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session as DbSession

from packages.api.core.database import get_db
from packages.api.features.auth.dependencies import get_current_profile
from packages.api.features.discovery import discovery_service
from packages.api.features.discovery.schemas import (
    DiscoveryFeedResponse,
    DiscoveryPassRequest,
)
from packages.api.features.profiles.models import Profile

router = APIRouter()

DbDependency = Annotated[DbSession, Depends(get_db)]
CurrentProfileDependency = Annotated[Profile, Depends(get_current_profile)]


@router.get("/feed", response_model=DiscoveryFeedResponse)
def get_discovery_feed(
    profile: CurrentProfileDependency,
    db: DbDependency,
    limit: int = Query(default=10, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
) -> DiscoveryFeedResponse:
    """Return the next page of discoverable profiles for the caller."""
    profiles = discovery_service.get_feed(db, profile, limit=limit, offset=offset)
    items = [discovery_service.to_discovery_profile_out(db, p) for p in profiles]
    return DiscoveryFeedResponse(profiles=items, next_offset=offset + len(items))


@router.post("/pass", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def post_discovery_pass(
    body: DiscoveryPassRequest,
    profile: CurrentProfileDependency,
    db: DbDependency,
) -> None:
    """Record a pass on `to_profile_id`. Idempotent: 204 even if already passed."""
    if body.to_profile_id == profile.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="cannot pass on self")
    discovery_service.record_pass(db, profile.id, body.to_profile_id)
