"""Location request/response schemas.

`LocationOut` is only ever returned for the caller's OWN location (see
`routes.get_my_location` / `routes.put_my_location`) -- raw lat/lng must
never appear in a response about another profile anywhere in this
codebase. Any response describing another profile's position uses
`location_service.distance_band` instead (see `discovery.schemas`).
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

# The fixed radius tiers per docs/product-plan.md lines 241-248 -- a
# closed enum, not a free-form float. `"any"` means "no radius limit".
#
# All members are `str` (not a mix of `int`/`str` literals) deliberately:
# FastAPI/Pydantic v2 validate a query param's raw string against
# `Literal` members by exact type match, not type coercion, so a mixed
# `Literal[1, 3, ..., "any"]` would reject every numeric query value
# (`?radius_km=5` never matches the literal `int` `5`) -- see
# `radius_km_value` below for the str -> float conversion this pushes
# into the service layer instead.
RadiusKm = Literal["1", "3", "5", "10", "25", "50", "100", "any"]


class LocationUpdateIn(BaseModel):
    """Payload for updating the caller's own GPS position."""

    latitude: float = Field(ge=-90.0, le=90.0)
    longitude: float = Field(ge=-180.0, le=180.0)


class LocationOut(BaseModel):
    """The caller's own location -- never serialize this for anyone else."""

    model_config = ConfigDict(from_attributes=True)

    profile_id: uuid.UUID
    latitude: float
    longitude: float
    updated_at: datetime
