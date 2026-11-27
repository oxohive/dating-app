"""Discovery service: candidate pool filtering (distance, preferences) and feed assembly.

Cross-feature model imports (see
tasks/0008-mvp-feature-completion/plan.md, "Cross-feature model imports"):
this module queries tables owned by the auth (B1), profiles (B1), and
safety (B3) subtasks, so it imports their ORM classes directly instead of
redefining them -- redefining a second class mapped to an existing table
name raises `Table already defined` the moment both get imported together.
`UserLocation` is this subtask's (B5) own `location` feature, imported the
same read-only way for consistency.

GPS-based nearby discovery (tasks/0010-wave2-deferred-features/plan.md
item 2) is a second, separate feed-building function, `get_nearby_feed`
-- it replaces the same-city filter with a location join (GPS discovery
is explicitly distance-based, not city-based) but keeps every other
exclusion (self/liked/passed/blocked/inactive) identical to `get_feed`.
Both the GPS feed and the compatibility-insights breakdown attached in
`to_discovery_profile_out` are Premium-gated -- enforced by the caller
(`routes.py`), which must check `has_active_premium` before calling
either.
"""
from __future__ import annotations

import uuid

from sqlalchemy import select, union_all
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from packages.api.features.auth.models import User
from packages.api.features.discovery import compatibility_service
from packages.api.features.discovery.models import Pass
from packages.api.features.discovery.recommendation_service import (
    completeness_score_expression,
)
from packages.api.features.discovery.schemas import DiscoveryProfileOut
from packages.api.features.likes.models import Like
from packages.api.features.location import location_service
from packages.api.features.location.models import UserLocation
from packages.api.features.profiles import photo_service
from packages.api.features.profiles.models import Profile
from packages.api.features.profiles.utils import compute_age
from packages.api.features.safety.models import Block


def _excluded_profile_ids(current_profile_id: uuid.UUID):
    """Profile ids that must never appear as a candidate for
    `current_profile_id`: self is handled separately by callers (a plain
    `!=` comparison), this covers already-liked, already-passed, and
    anyone in either direction of a block -- shared by both `get_feed`
    and `get_nearby_feed` so the two feeds can never disagree on who's
    excluded."""
    return union_all(
        select(Like.to_profile_id).where(Like.from_profile_id == current_profile_id),
        select(Pass.to_profile_id).where(Pass.from_profile_id == current_profile_id),
        select(Block.blocked_profile_id).where(Block.blocker_profile_id == current_profile_id),
        select(Block.blocker_profile_id).where(Block.blocked_profile_id == current_profile_id),
    )


def get_feed(db: Session, current_profile, limit: int = 10, offset: int = 0) -> list:
    """Return up to `limit` discoverable profiles for `current_profile`.

    Excludes: self, already-liked targets, already-passed targets, anyone
    in either direction of the `blocks` table, and inactive accounts.
    Same-city only this wave (no radius/GPS -- see `get_nearby_feed` for
    the Premium GPS-based feed). Ordered by profile completeness, then
    recency.
    """
    excluded_ids = _excluded_profile_ids(current_profile.id)

    score = completeness_score_expression(Profile)

    stmt = (
        select(Profile)
        .join(User, Profile.user_id == User.id)
        .where(
            Profile.id != current_profile.id,
            Profile.city == current_profile.city,
            User.is_active.is_(True),
            Profile.id.notin_(excluded_ids),
        )
        .order_by(score.desc(), Profile.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    return list(db.execute(stmt).scalars())


def get_nearby_feed(
    db: Session,
    current_profile: Profile,
    current_location: UserLocation,
    radius_km: float | None,
    limit: int = 10,
    offset: int = 0,
) -> list[tuple[Profile, float]]:
    """Premium GPS-based feed: candidates with a recorded `UserLocation`,
    ordered nearest-first, optionally filtered to `radius_km` (`None`
    means "any distance", no limit). Same like/pass/block/inactive
    exclusions as `get_feed`, but -- unlike `get_feed` -- does NOT filter
    by `Profile.city`: GPS discovery is explicitly distance-based, not
    city-based (plan.md item 2). Returns `(Profile, distance_km)` pairs so
    callers can band the distance for display without ever exposing a raw
    coordinate.

    Callers (`routes.py`) MUST have already confirmed the caller is
    Premium via `has_active_premium` -- this function has no awareness of
    entitlements.
    """
    excluded_ids = _excluded_profile_ids(current_profile.id)

    candidate_ids = list(
        db.execute(
            select(Profile.id)
            .join(User, Profile.user_id == User.id)
            .join(UserLocation, UserLocation.profile_id == Profile.id)
            .where(
                Profile.id != current_profile.id,
                User.is_active.is_(True),
                Profile.id.notin_(excluded_ids),
            )
        ).scalars()
    )
    if not candidate_ids:
        return []

    postgis_ids: set[uuid.UUID] | None = None
    if radius_km is not None:
        postgis_ids = location_service.postgis_within_radius_ids(
            db, current_location.latitude, current_location.longitude, radius_km, candidate_ids
        )

    locations_by_profile = {
        loc.profile_id: loc
        for loc in db.execute(
            select(UserLocation).where(UserLocation.profile_id.in_(candidate_ids))
        ).scalars()
    }

    scored: list[tuple[uuid.UUID, float]] = []
    for profile_id in candidate_ids:
        location = locations_by_profile.get(profile_id)
        if location is None:
            continue
        distance_km = location_service.haversine_km(
            current_location.latitude,
            current_location.longitude,
            location.latitude,
            location.longitude,
        )
        if radius_km is not None:
            if postgis_ids is not None:
                if profile_id not in postgis_ids:
                    continue
            elif distance_km > radius_km:
                continue
        scored.append((profile_id, distance_km))

    scored.sort(key=lambda pair: pair[1])
    page = scored[offset : offset + limit]
    if not page:
        return []

    page_ids = [pid for pid, _ in page]
    profiles_by_id = {
        p.id: p for p in db.execute(select(Profile).where(Profile.id.in_(page_ids))).scalars()
    }
    return [
        (profiles_by_id[profile_id], distance_km)
        for profile_id, distance_km in page
        if profile_id in profiles_by_id
    ]


def to_discovery_profile_out(
    db: Session,
    profile: Profile,
    *,
    distance_km: float | None = None,
    compatibility_with: Profile | None = None,
) -> DiscoveryProfileOut:
    """Build a `DiscoveryProfileOut` for a feed item.

    `age` and `photo_urls` aren't plain attributes of `Profile`, so this
    builds the schema explicitly rather than via `model_validate`: `age` is
    computed from the owning `User.date_of_birth` (one extra lookup per
    profile -- acceptable at this wave's feed-page scale), and
    `photo_urls` reuses `profiles.photo_service`'s S3-key-to-URL helper
    (the same one `GET /profiles/me` / `GET /profiles/{id}` use) rather
    than exposing bare `s3_key`s.

    `distance_km`, if given, is banded via `location_service.distance_band`
    before it ever reaches the response -- this function never puts a raw
    distance or coordinate into `DiscoveryProfileOut`.
    `compatibility_with`, if given, is the CALLER's own `Profile` (not
    `profile`'s), used to compute a Premium-gated `CompatibilityBreakdown`.
    Passing it only when the caller has `has_active_premium` IS the gate --
    this function does not check entitlements itself.
    """
    user = db.get(User, profile.user_id)
    age = compute_age(user.date_of_birth) if user is not None else None
    distance_band = location_service.distance_band(distance_km) if distance_km is not None else None

    compatibility = None
    if compatibility_with is not None:
        compatibility = compatibility_service.compute_compatibility(
            intention_a=compatibility_with.relationship_intention,
            intention_b=profile.relationship_intention,
            interests_a=compatibility_with.interests,
            interests_b=profile.interests,
            distance_km=distance_km,
        )

    return DiscoveryProfileOut(
        id=profile.id,
        display_name=profile.display_name,
        age=age,
        gender=profile.gender,
        orientation_preferences=profile.orientation_preferences,
        relationship_intention=profile.relationship_intention,
        bio=profile.bio,
        interests=profile.interests,
        city=profile.city,
        locality=profile.locality,
        photo_urls=photo_service.ordered_photo_urls(list(profile.photos)),
        distance_band=distance_band,
        compatibility=compatibility,
    )


def record_pass(db: Session, from_profile_id: uuid.UUID, to_profile_id: uuid.UUID) -> None:
    """Record a pass. Idempotent: repeating it is a no-op, not an error/duplicate row."""
    existing = db.execute(
        select(Pass.id).where(
            Pass.from_profile_id == from_profile_id, Pass.to_profile_id == to_profile_id
        )
    ).scalar_one_or_none()
    if existing is not None:
        return

    db.add(Pass(from_profile_id=from_profile_id, to_profile_id=to_profile_id))
    try:
        db.commit()
    except IntegrityError:
        # Lost a race against a concurrent identical pass request.
        db.rollback()
