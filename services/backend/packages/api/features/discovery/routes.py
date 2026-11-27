"""Discovery feature routes.

`GET /discovery/feed` and `POST /discovery/pass`, per the endpoint
contract in tasks/0008-mvp-feature-completion/plan.md. Extended this wave
(tasks/0010-wave2-deferred-features/plan.md item 2+4) with:

- An optional `radius_km` query param on `GET /feed` for Premium
  GPS-based nearby discovery (fixed enum: 1/3/5/10/25/50/100/"any" --
  anything else is rejected with 422 by FastAPI's own `Literal`
  validation, no custom parsing needed). Omitting it keeps the original
  free, same-city feed behavior unchanged.
- A Premium-gated compatibility-insights breakdown attached to each feed
  item (`DiscoveryProfileOut.compatibility`).
- `GET /discovery/profiles/{profile_id}/compatibility`: a standalone
  compatibility-breakdown lookup for one target profile. This stands in
  for the plan's "surfaced on GET /profiles/{id}" requirement --
  `features/profiles/**` is NOT in this subtask's owned paths this wave
  (no subtask owns it) and is explicitly on this subtask's do-not-touch
  list, so the breakdown is exposed here instead, inside `discovery`'s
  own owned paths. See this subtask's final report for the integration
  step: a true `GET /profiles/{id}` embed would need the `profiles`
  owner (or a future wave) to call into `discovery.compatibility_service`
  the same way this router does.
"""
from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session as DbSession

from packages.api.core.database import get_db
from packages.api.features.auth.dependencies import get_current_profile
from packages.api.features.discovery import discovery_service
from packages.api.features.discovery.schemas import (
    CompatibilityBreakdown,
    DiscoveryFeedResponse,
    DiscoveryPassRequest,
    RadiusKm,
)
from packages.api.features.location import location_service
from packages.api.features.profiles.models import Profile
from packages.api.features.profiles.profile_service import get_profile_by_id
from packages.api.features.subscriptions.subscriptions_service import has_active_premium

router = APIRouter()

DbDependency = Annotated[DbSession, Depends(get_db)]
CurrentProfileDependency = Annotated[Profile, Depends(get_current_profile)]

_GPS_PREMIUM_DETAIL = "GPS-based nearby discovery is a Premium feature"
_COMPATIBILITY_PREMIUM_DETAIL = "Compatibility insights is a Premium feature"


@router.get("/feed", response_model=DiscoveryFeedResponse)
def get_discovery_feed(
    profile: CurrentProfileDependency,
    db: DbDependency,
    limit: int = Query(default=10, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    radius_km: RadiusKm | None = Query(  # noqa: B008 - standard FastAPI Query-default idiom
        default=None,
        description='Premium-only GPS radius filter: 1, 3, 5, 10, 25, 50, 100 (km), or "any".',
    ),
) -> DiscoveryFeedResponse:
    """Return the next page of discoverable profiles for the caller.

    Free behavior (no `radius_km`): unchanged same-city feed, with the
    pre-existing `interests`/`relationship_intention` fields intact.
    Premium, with `radius_km`: GPS-based nearby feed instead, ordered
    nearest-first, filtered to the requested radius (or unfiltered for
    `"any"`). Premium users (with or without `radius_km`) additionally
    get a `compatibility` breakdown per item.
    """
    is_premium = has_active_premium(db, profile.user_id)

    if radius_km is not None:
        if not is_premium:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=_GPS_PREMIUM_DETAIL)
        current_location = location_service.get_location(db, profile.id)
        if current_location is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Set your location before using GPS-based discovery",
            )
        pairs = discovery_service.get_nearby_feed(
            db,
            profile,
            current_location,
            location_service.radius_km_value(radius_km),
            limit=limit,
            offset=offset,
        )
        items = [
            discovery_service.to_discovery_profile_out(
                db, p, distance_km=distance_km, compatibility_with=profile
            )
            for p, distance_km in pairs
        ]
    else:
        profiles = discovery_service.get_feed(db, profile, limit=limit, offset=offset)
        items = [
            discovery_service.to_discovery_profile_out(
                db, p, compatibility_with=profile if is_premium else None
            )
            for p in profiles
        ]

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


@router.get("/profiles/{profile_id}/compatibility", response_model=CompatibilityBreakdown)
def get_compatibility_breakdown(
    profile_id: uuid.UUID,
    profile: CurrentProfileDependency,
    db: DbDependency,
) -> CompatibilityBreakdown:
    """Premium-only: the compatibility breakdown between the caller and
    `profile_id`. Distance is resolved via each profile's own
    `UserLocation` if both have one recorded; otherwise the proximity
    factor is reported as unavailable rather than guessed."""
    if not has_active_premium(db, profile.user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=_COMPATIBILITY_PREMIUM_DETAIL
        )

    target = get_profile_by_id(db, profile_id)
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    distance_km = None
    my_location = location_service.get_location(db, profile.id)
    their_location = location_service.get_location(db, target.id)
    if my_location is not None and their_location is not None:
        distance_km = location_service.haversine_km(
            my_location.latitude,
            my_location.longitude,
            their_location.latitude,
            their_location.longitude,
        )

    item = discovery_service.to_discovery_profile_out(
        db, target, distance_km=distance_km, compatibility_with=profile
    )
    assert item.compatibility is not None  # compatibility_with was passed above
    return item.compatibility
