"""Compatibility insights: a transparent, explainable score combining
relationship-intention match, shared interests, and proximity.

Per tasks/0010-wave2-deferred-features/plan.md item 4 and
`docs/product-plan.md` Module 9 ("Compatibility System"): this is
deliberately NOT a machine-learning / black-box score -- every
contributing factor is a simple, documented rule, exposed in the
breakdown so a user can see exactly why a number came out the way it
did. The product plan is explicit that these weights are "hypotheses,
not validated scientific measurements" and that compatibility scores
must never be presented as scientifically proven predictions -- see
`CompatibilityBreakdown.disclaimer` in `schemas.py`, included on every
breakdown this module builds.

This whole breakdown is Premium-gated (the caller -- `discovery_service`
/ `discovery/routes.py` -- must check `has_active_premium` before ever
calling `compute_compatibility`; this module itself has no awareness of
entitlements, it just computes). The pre-existing free fields
(`interests`, `relationship_intention`) on `DiscoveryProfileOut` are
untouched by this module.
"""
from __future__ import annotations

from packages.api.features.discovery.schemas import (
    CompatibilityBreakdown,
    CompatibilityFactor,
)
from packages.api.features.location.location_service import distance_band

# Weights sum to 1.0 -- an illustrative starting model per
# docs/product-plan.md Module 9's weight table, collapsed to the three
# dimensions this wave actually has signal for (relationship intentions,
# interests, and location/proximity). Lifestyle/personality/communication
# dimensions aren't modeled yet (no profile fields capture them this
# wave) -- NOT folded silently into another factor's weight.
_INTENTION_WEIGHT = 0.4
_INTERESTS_WEIGHT = 0.35
_PROXIMITY_WEIGHT = 0.25

# Proximity sub-score per distance band -- closer is more compatible,
# banded identically to the privacy-preserving label shown elsewhere
# (see `location_service.distance_band`); never a precise distance.
_PROXIMITY_BAND_SCORE: dict[str, float] = {
    "<1km": 1.0,
    "1-3km": 0.85,
    "3-5km": 0.7,
    "5-10km": 0.55,
    "10-25km": 0.4,
    "25-50km": 0.25,
    "50-100km": 0.1,
    "100km+": 0.0,
}

_LABEL_THRESHOLDS: tuple[tuple[float, str], ...] = (
    (0.75, "Strong potential match"),
    (0.5, "Some common ground"),
    (0.25, "Limited overlap"),
)
_LOWEST_LABEL = "Little in common (based on available signals)"


def _intention_factor(intention_a: str | None, intention_b: str | None) -> CompatibilityFactor:
    if not intention_a or not intention_b:
        return CompatibilityFactor(
            name="relationship_intention",
            match=None,
            score=0.0,
            note="Relationship intention not set on one or both profiles.",
        )
    is_match = intention_a == intention_b
    return CompatibilityFactor(
        name="relationship_intention",
        match=is_match,
        score=_INTENTION_WEIGHT * (1.0 if is_match else 0.0),
        note=(
            f"Both looking for {intention_a}."
            if is_match
            else f"Different relationship intentions ({intention_a} vs {intention_b})."
        ),
    )


def _interests_factor(
    interests_a: list[str] | None, interests_b: list[str] | None
) -> CompatibilityFactor:
    set_a = {i.strip().lower() for i in (interests_a or []) if i and i.strip()}
    set_b = {i.strip().lower() for i in (interests_b or []) if i and i.strip()}
    if not set_a or not set_b:
        return CompatibilityFactor(
            name="shared_interests",
            match=False,
            score=0.0,
            note="Not enough interests listed to compare.",
        )
    shared = set_a & set_b
    union = set_a | set_b
    ratio = len(shared) / len(union) if union else 0.0
    return CompatibilityFactor(
        name="shared_interests",
        match=len(shared) > 0,
        score=_INTERESTS_WEIGHT * ratio,
        note=(
            f"{len(shared)} shared interest(s) out of {len(union)} combined."
            if shared
            else "No shared interests listed."
        ),
    )


def _proximity_factor(distance_km: float | None) -> CompatibilityFactor:
    if distance_km is None:
        return CompatibilityFactor(
            name="proximity",
            match=None,
            score=0.0,
            note="Location not available for one or both profiles.",
        )
    band = distance_band(distance_km)
    band_score = _PROXIMITY_BAND_SCORE[band]
    return CompatibilityFactor(
        name="proximity",
        match=None,
        score=_PROXIMITY_WEIGHT * band_score,
        note=f"Approximately {band} apart.",
    )


def _overall_label(overall_score: float) -> str:
    for threshold, label in _LABEL_THRESHOLDS:
        if overall_score >= threshold:
            return label
    return _LOWEST_LABEL


def compute_compatibility(
    *,
    intention_a: str | None,
    intention_b: str | None,
    interests_a: list[str] | None,
    interests_b: list[str] | None,
    distance_km: float | None,
) -> CompatibilityBreakdown:
    """Build a transparent compatibility breakdown between two profiles.

    Takes plain fields rather than ORM objects so this stays a pure,
    independently unit-testable function with no DB/session dependency.
    Callers (`discovery_service`) are responsible for the Premium gate
    and for resolving `distance_km` (via `location_service.haversine_km`,
    or `None` if either profile has no recorded location).
    """
    intention = _intention_factor(intention_a, intention_b)
    interests = _interests_factor(interests_a, interests_b)
    proximity = _proximity_factor(distance_km)

    overall_score = round(intention.score + interests.score + proximity.score, 4)
    return CompatibilityBreakdown(
        overall_score=overall_score,
        overall_label=_overall_label(overall_score),
        factors=[intention, interests, proximity],
    )
