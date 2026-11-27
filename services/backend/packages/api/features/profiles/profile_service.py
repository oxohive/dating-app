"""Profile service: CRUD + public-view projection for profile data."""
from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from packages.api.features.auth.models import User
from packages.api.features.profiles.models import Profile
from packages.api.features.profiles.schemas import ProfileUpdateIn, PublicProfileOut
from packages.api.features.profiles.utils import compute_age

DELETED_USER_PLACEHOLDER = "Deleted user"


def get_profile_by_user_id(db: DbSession, user_id: uuid.UUID) -> Profile | None:
    return db.scalar(select(Profile).where(Profile.user_id == user_id))


def scrub_profile_pii(db: DbSession, profile: Profile) -> Profile:
    """Scrub PII from `profile` for self-service account deletion.

    Clears `display_name` (replaced with a fixed placeholder -- never left
    blank, since `matches/routes.py` and `messaging/routes.py` both resolve
    a match/conversation participant's `display_name` via a live
    `db.get(Profile, other_id)` lookup at request time with no filtering,
    so this placeholder is what renders there automatically) and
    `bio`/`interests`. Deliberately does NOT touch `city`/`locality`/
    `gender`/`relationship_intention`/`created_at` -- not PII, and useful
    for aggregate analytics that shouldn't break when accounts are
    deleted. Admin suspension (`admin_service.suspend_user`) must NOT call
    this, since a suspension might be reversed.

    Does not commit -- the caller (`auth_service.delete_account`) commits
    this in the same transaction as the owning `User`'s `is_active`/
    `deleted_at` flip.
    """
    profile.display_name = DELETED_USER_PLACEHOLDER
    profile.bio = None
    profile.interests = None
    db.add(profile)
    return profile


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
