"""Location ORM models: `UserLocation`.

Stores each profile's most recent GPS position as plain `Double` lat/lng
columns -- deliberately NOT a PostGIS `geography` column (see
tasks/0010-wave2-deferred-features/plan.md item 2 and this feature's own
task brief): PostGIS is used only at *query* time, casting these floats
to a geography point on the fly (see `location_service.postgis_within_radius_ids`),
which keeps this ORM class portable across the SQLite-in-memory DB this
repo's whole test suite runs against and a real Postgres+PostGIS pilot
DB.

One row per profile (`profile_id` is unique) -- position updates upsert
in place; no location history is kept this wave. `profile_id` is a plain
FK into the `profiles` table (owned by subtask B1 / the `profiles`
feature) -- `Profile` is imported read-only elsewhere (e.g.
`location_service`), never redefined here, per the cross-feature-import
rule.

Writing and radius-based reading of this table are both Premium-gated
(`has_active_premium`, from `features/subscriptions`) -- enforced at the
route layer in `routes.py`, not here.
"""
from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, Double, ForeignKey, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from packages.api.core.database import Base


def _utcnow() -> datetime:
    return datetime.now(UTC)


class UserLocation(Base):
    """A profile's current GPS position (Premium-gated; never exposed raw
    to any profile other than its owner -- see `location_service` /
    `discovery` for the distance-banding that replaces raw coordinates in
    every response about another profile)."""

    __tablename__ = "user_locations"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    profile_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("profiles.id"), unique=True, nullable=False, index=True
    )
    latitude: Mapped[float] = mapped_column(Double, nullable=False)
    longitude: Mapped[float] = mapped_column(Double, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )
