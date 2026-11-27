"""Location feature routes.

`PUT /location/me` lets a user update their own GPS position --
Premium-gated per tasks/0010-wave2-deferred-features/plan.md ("GPS is
Premium-only"). `GET /location/me` returns the caller's own raw
coordinates (never anyone else's -- see `location/schemas.py`'s
`LocationOut` docstring).
"""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DbSession

from packages.api.core.database import get_db
from packages.api.features.auth.dependencies import get_current_profile
from packages.api.features.location import location_service
from packages.api.features.location.schemas import LocationOut, LocationUpdateIn
from packages.api.features.profiles.models import Profile
from packages.api.features.subscriptions.subscriptions_service import has_active_premium

router = APIRouter()

DbDependency = Annotated[DbSession, Depends(get_db)]
CurrentProfileDependency = Annotated[Profile, Depends(get_current_profile)]

_PREMIUM_REQUIRED_DETAIL = "GPS location is a Premium feature"


def _require_premium(db: DbSession, profile: Profile) -> None:
    if not has_active_premium(db, profile.user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=_PREMIUM_REQUIRED_DETAIL)


@router.put("/me", response_model=LocationOut)
def put_my_location(
    payload: LocationUpdateIn,
    profile: CurrentProfileDependency,
    db: DbDependency,
) -> LocationOut:
    """Update the caller's own GPS position. Premium-only."""
    _require_premium(db, profile)
    location = location_service.upsert_location(db, profile.id, payload.latitude, payload.longitude)
    return LocationOut.model_validate(location)


@router.get("/me", response_model=LocationOut)
def get_my_location(
    profile: CurrentProfileDependency,
    db: DbDependency,
) -> LocationOut:
    """Return the caller's own last-recorded GPS position. Premium-only
    (same gate as the write path -- a non-Premium user has no business
    reading GPS state either, consistent with the feature being Premium
    end to end)."""
    _require_premium(db, profile)
    location = location_service.get_location(db, profile.id)
    if location is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not set")
    return LocationOut.model_validate(location)
