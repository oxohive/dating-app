"""Discovery service: candidate pool filtering (distance, preferences) and feed assembly.

Cross-feature model imports (see
tasks/0008-mvp-feature-completion/plan.md, "Cross-feature model imports"):
this module queries tables owned by the auth (B1), profiles (B1), and
safety (B3) subtasks, so it imports their ORM classes directly instead of
redefining them -- redefining a second class mapped to an existing table
name raises `Table already defined` the moment both get imported together.
"""
from __future__ import annotations

import uuid

from sqlalchemy import select, union_all
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from packages.api.features.auth.models import User
from packages.api.features.discovery.models import Pass
from packages.api.features.discovery.recommendation_service import (
    completeness_score_expression,
)
from packages.api.features.discovery.schemas import DiscoveryProfileOut
from packages.api.features.likes.models import Like
from packages.api.features.profiles import photo_service
from packages.api.features.profiles.models import Profile
from packages.api.features.profiles.utils import compute_age
from packages.api.features.safety.models import Block


def get_feed(db: Session, current_profile, limit: int = 10, offset: int = 0) -> list:
    """Return up to `limit` discoverable profiles for `current_profile`.

    Excludes: self, already-liked targets, already-passed targets, anyone
    in either direction of the `blocks` table, and inactive accounts.
    Same-city only this wave (no radius/GPS). Ordered by profile
    completeness, then recency.
    """
    excluded_ids = union_all(
        select(Like.to_profile_id).where(Like.from_profile_id == current_profile.id),
        select(Pass.to_profile_id).where(Pass.from_profile_id == current_profile.id),
        select(Block.blocked_profile_id).where(Block.blocker_profile_id == current_profile.id),
        select(Block.blocker_profile_id).where(Block.blocked_profile_id == current_profile.id),
    )

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


def to_discovery_profile_out(db: Session, profile: Profile) -> DiscoveryProfileOut:
    """Build a `DiscoveryProfileOut` for a feed item.

    `age` and `photo_urls` aren't plain attributes of `Profile`, so this
    builds the schema explicitly rather than via `model_validate`: `age` is
    computed from the owning `User.date_of_birth` (one extra lookup per
    profile -- acceptable at this wave's feed-page scale), and
    `photo_urls` reuses `profiles.photo_service`'s S3-key-to-URL helper
    (the same one `GET /profiles/me` / `GET /profiles/{id}` use) rather
    than exposing bare `s3_key`s.
    """
    user = db.get(User, profile.user_id)
    age = compute_age(user.date_of_birth) if user is not None else None
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
