"""Profile service: CRUD + public-view projection for profile data."""
from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from packages.api.features.auth.models import User
from packages.api.features.profiles.models import Profile
from packages.api.features.profiles.schemas import ProfileUpdateIn, PublicProfileOut
from packages.api.features.profiles.utils import compute_age


def get_profile_by_user_id(db: DbSession, user_id: uuid.UUID) -> Profile | None:
    return db.scalar(select(Profile).where(Profile.user_id == user_id))


def get_profile_by_id(db: DbSession, profile_id: uuid.UUID) -> Profile | None:
    return db.get(Profile, profile_id)


def update_profile(db: DbSession, profile: Profile, patch: ProfileUpdateIn) -> Profile:
    """Apply only the fields provided in `patch` to `profile`."""
    data = patch.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(profile, field, value)
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


def to_public_profile(db: DbSession, profile: Profile) -> PublicProfileOut:
    """Project a `Profile` row into the public (non-owner) view.

    Excludes phone_number/email/raw date_of_birth; exposes a computed `age`
    sourced from the owning `User.date_of_birth`.

    Note: this wave does not check the `blocks` table (owned by the
    messaging/safety/admin subtask, not yet landed when this was written) —
    the plan marks that check as a "nice to have, not a hard blocker" for
    this wave.
    """
    user = db.get(User, profile.user_id)
    age = compute_age(user.date_of_birth) if user is not None else None
    return PublicProfileOut(
        id=profile.id,
        display_name=profile.display_name,
        age=age,
        gender=profile.gender,
        bio=profile.bio,
        interests=profile.interests,
        city=profile.city,
        locality=profile.locality,
        photos=list(profile.photos),
    )
