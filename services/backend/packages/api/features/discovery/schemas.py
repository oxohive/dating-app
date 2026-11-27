"""Discovery request/response schemas.

Also re-exports `RadiusKm` from `features.location.schemas` (import, not
redefine -- the fixed radius enum lives in `location` since it's
fundamentally a location concept; `discovery`'s feed endpoint just
accepts it as a query param) and defines the compatibility-insights
breakdown schemas (`CompatibilityFactor`/`CompatibilityBreakdown`) --
Premium-gated, see `compatibility_service.py`.
"""
from __future__ import annotations

import uuid

from pydantic import BaseModel

from packages.api.features.location.schemas import RadiusKm

__all__ = [
    "RadiusKm",
    "CompatibilityFactor",
    "CompatibilityBreakdown",
    "DiscoveryProfileOut",
    "DiscoveryFeedResponse",
    "DiscoveryPassRequest",
]


class CompatibilityFactor(BaseModel):
    """One transparent, explainable contributor to a compatibility score.

    `score` is this factor's own 0..1 contribution (already weighted into
    `CompatibilityBreakdown.overall_score`) -- exposed so the breakdown is
    inspectable, not a black box. `match` is a simple boolean summary where
    one applies (e.g. relationship-intention equality); `None` when the
    factor is inherently graded rather than binary (e.g. proximity).
    """

    name: str
    match: bool | None
    score: float
    note: str


class CompatibilityBreakdown(BaseModel):
    """A transparent compatibility estimate -- relationship-intention
    match, shared interests, and proximity, NOT framed as a scientifically
    validated prediction (see `docs/product-plan.md` Module 9: "Do not
    present compatibility scores as scientifically proven predictions.").

    Premium-gated: only ever populated when the caller passes
    `has_active_premium`. Free users keep the pre-existing, unrelated
    `interests`/`relationship_intention` fields on `DiscoveryProfileOut`
    unchanged -- this breakdown is additive, not a replacement.
    """

    overall_score: float
    overall_label: str
    factors: list[CompatibilityFactor]
    disclaimer: str = (
        "This compatibility insight is an illustrative, transparent estimate "
        "based on shared profile signals (relationship intention, interests, "
        "proximity) -- it is a hypothesis, not a scientifically validated or "
        "proven prediction of real-world compatibility."
    )


class DiscoveryProfileOut(BaseModel):
    """Public profile summary for a discovery feed item.

    Extends the original Profile-only field set with `age` (computed from
    the owning User's date_of_birth, never the raw DOB itself -- no User
    fields such as phone_number/email/date_of_birth are ever exposed) and
    `photo_urls` (resolved via `profiles.photo_service`, primary photo
    first) -- a swipeable card needs both to actually be usable. Built
    explicitly by `discovery_service.to_discovery_profile_out` rather than
    `model_validate`, since age/photo_urls aren't plain attributes of a
    `Profile` row.

    `distance_band` and `compatibility` are both new, additive,
    Premium-gated fields (tasks/0010-wave2-deferred-features):
    `distance_band` is only ever a banded label (`<1km`, `1-3km`, ...,
    `100km+`) -- this schema has NO raw latitude/longitude field for
    another profile, by design, and never will (see
    `location_service.distance_band`). `compatibility` is `None` unless
    the caller is Premium. The pre-existing free fields (`interests`,
    `relationship_intention`, etc.) are unchanged and never gated.
    """

    id: uuid.UUID
    display_name: str
    age: int | None = None
    gender: str | None = None
    orientation_preferences: list[str] | None = None
    relationship_intention: str | None = None
    bio: str | None = None
    interests: list[str] | None = None
    city: str | None = None
    locality: str | None = None
    photo_urls: list[str] = []
    distance_band: str | None = None
    compatibility: CompatibilityBreakdown | None = None

    model_config = {"from_attributes": True}


class DiscoveryFeedResponse(BaseModel):
    profiles: list[DiscoveryProfileOut]
    next_offset: int


class DiscoveryPassRequest(BaseModel):
    to_profile_id: uuid.UUID
