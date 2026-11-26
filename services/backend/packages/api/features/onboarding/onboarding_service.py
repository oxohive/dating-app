"""Onboarding service: one-time profile creation for a newly verified user."""
from __future__ import annotations

from sqlalchemy.orm import Session as DbSession

from packages.api.features.auth.models import User
from packages.api.features.onboarding.schemas import ProfileCreateIn
from packages.api.features.profiles.models import Profile
from packages.api.features.profiles.profile_service import get_profile_by_user_id


class ProfileAlreadyExistsError(Exception):
    """Raised when the user has already completed onboarding."""


def create_profile(db: DbSession, user: User, payload: ProfileCreateIn) -> Profile:
    """Create the one-time `Profile` row for `user`.

    Also back-fills `User.date_of_birth`, which is only known once
    onboarding is submitted (see the deviation note in
    `packages.api.features.auth.models`). Raises `ProfileAlreadyExistsError`
    if a profile already exists for this user.
    """
    existing = get_profile_by_user_id(db, user.id)
    if existing is not None:
        raise ProfileAlreadyExistsError("profile already exists for this user")

    user.date_of_birth = payload.date_of_birth
    db.add(user)

    profile = Profile(
        user_id=user.id,
        display_name=payload.display_name,
        gender=payload.gender,
        orientation_preferences=payload.orientation_preferences,
        relationship_intention=payload.relationship_intention,
        bio=payload.bio,
        interests=payload.interests,
        city=payload.city,
        locality=payload.locality,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile
