"""Location service: write/read a profile's own GPS position, plus the
Haversine distance + fixed-band logic that every other GPS-aware feature
(`discovery`'s nearby feed and compatibility breakdown) builds on.

PostGIS note: `UserLocation.latitude`/`longitude` are plain `Double`
columns (see `models.py`), not a PostGIS geography column. PostGIS is
used only as a best-effort *query accelerator* on a real Postgres
connection (`postgis_within_radius_ids` below), casting those floats to
a geography point at query time -- the `postgis/postgis:16-3.4` image
already provisioned for this project installs the extension, and the
integration step's migration must additionally run
`op.execute("CREATE EXTENSION IF NOT EXISTS postgis")` defensively (see
tasks/0010-wave2-deferred-features/plan.md's Risks section) since this
module cannot assume that happened.

Correctness never depends on PostGIS being available: `haversine_km` is
the single source of truth distance calculation, runs identically on
SQLite (this repo's test convention) and Postgres, and every caller
falls back to it if the PostGIS path isn't applicable (wrong dialect) or
fails for any reason (e.g. extension not yet installed).
"""
from __future__ import annotations

import math
import uuid
from datetime import UTC, datetime

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from packages.api.features.location.models import UserLocation
from packages.api.features.location.schemas import RadiusKm

_EARTH_RADIUS_KM = 6371.0088

# (exclusive upper bound in km, label). Ordered ascending; see plan.md's
# banding scheme -- `distance_band` buckets a raw distance DOWN into the
# first band whose upper bound it is strictly less than. A distance >=
# 100 falls through to "100km+".
_BANDS: tuple[tuple[float, str], ...] = (
    (1, "<1km"),
    (3, "1-3km"),
    (5, "3-5km"),
    (10, "5-10km"),
    (25, "10-25km"),
    (50, "25-50km"),
    (100, "50-100km"),
)

_UNBOUNDED_LABEL = "100km+"


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance between two lat/lng points, in kilometers."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    )
    return 2 * _EARTH_RADIUS_KM * math.asin(min(1.0, math.sqrt(a)))


def distance_band(distance_km: float) -> str:
    """Bucket a raw distance into the fixed, never-precise band scheme.

    Exactly: `<1km`, `1-3km`, `3-5km`, `5-10km`, `10-25km`, `25-50km`,
    `50-100km`, `100km+`. This is the ONLY form a distance to another
    profile may ever take in an API response -- never a raw float.
    """
    if distance_km < 0:
        raise ValueError("distance_km must be non-negative")
    for upper, label in _BANDS:
        if distance_km < upper:
            return label
    return _UNBOUNDED_LABEL


def radius_km_value(radius: RadiusKm) -> float | None:
    """Convert a validated `RadiusKm` enum value (a `str`, see
    `schemas.RadiusKm`) to a float km filter, or `None` for `"any"` (no
    limit)."""
    return None if radius == "any" else float(radius)


def upsert_location(
    db: Session, profile_id: uuid.UUID, latitude: float, longitude: float
) -> UserLocation:
    """Create or update the caller's own GPS position (one row per profile,
    upserted in place -- no history kept)."""
    existing = db.execute(
        select(UserLocation).where(UserLocation.profile_id == profile_id)
    ).scalar_one_or_none()
    if existing is not None:
        existing.latitude = latitude
        existing.longitude = longitude
        existing.updated_at = datetime.now(UTC)
    else:
        existing = UserLocation(profile_id=profile_id, latitude=latitude, longitude=longitude)
        db.add(existing)
    db.commit()
    db.refresh(existing)
    return existing


def get_location(db: Session, profile_id: uuid.UUID) -> UserLocation | None:
    """Return `profile_id`'s own recorded location, or `None` if never set."""
    return db.execute(
        select(UserLocation).where(UserLocation.profile_id == profile_id)
    ).scalar_one_or_none()


def postgis_within_radius_ids(
    db: Session,
    latitude: float,
    longitude: float,
    radius_km: float,
    candidate_profile_ids: list[uuid.UUID],
) -> set[uuid.UUID] | None:
    """Best-effort PostGIS pre-filter: which of `candidate_profile_ids`
    have a `UserLocation` within `radius_km` of (latitude, longitude).

    Returns `None` (meaning "not applicable, caller must fall back to
    `haversine_km`") on any dialect other than `postgresql` (notably
    SQLite, this repo's test convention), on an empty candidate list, or
    if the query itself raises for any reason (e.g. the `postgis`
    extension isn't installed in a given environment yet). This module
    never depends on PostGIS being present for correctness -- only as a
    query accelerator on the real pilot DB.
    """
    if db.bind is None or db.bind.dialect.name != "postgresql" or not candidate_profile_ids:
        return None
    try:
        rows = db.execute(
            text(
                """
                SELECT profile_id FROM user_locations
                WHERE profile_id = ANY(:ids)
                AND ST_DWithin(
                    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
                    ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                    :radius_m
                )
                """
            ),
            {
                "ids": candidate_profile_ids,
                "lng": longitude,
                "lat": latitude,
                "radius_m": radius_km * 1000,
            },
        ).fetchall()
        return {row[0] for row in rows}
    except Exception:  # noqa: BLE001 - defensive accelerator, never fatal
        return None
