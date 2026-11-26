"""Profiles feature routes: self-service profile + photo management, public view."""
from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DbSession

from packages.api.core.database import get_db
from packages.api.features.auth.dependencies import get_current_profile
from packages.api.features.profiles import photo_service, profile_service
from packages.api.features.profiles.models import Profile, ProfilePhoto
from packages.api.features.profiles.schemas import (
    PhotoConfirmIn,
    PhotoOut,
    PhotoPresignIn,
    PhotoPresignOut,
    ProfileOut,
    ProfileUpdateIn,
    PublicProfileOut,
)

router = APIRouter()

DbDependency = Annotated[DbSession, Depends(get_db)]
CurrentProfileDependency = Annotated[Profile, Depends(get_current_profile)]


@router.get("/me", response_model=ProfileOut)
def get_my_profile(profile: CurrentProfileDependency) -> Profile:
    return profile


@router.patch("/me", response_model=ProfileOut)
def patch_my_profile(
    payload: ProfileUpdateIn,
    profile: CurrentProfileDependency,
    db: DbDependency,
) -> Profile:
    return profile_service.update_profile(db, profile, payload)


@router.post(
    "/me/photos/presign", response_model=PhotoPresignOut, status_code=status.HTTP_200_OK
)
def presign_my_photo(
    payload: PhotoPresignIn, profile: CurrentProfileDependency
) -> PhotoPresignOut:
    upload_url, s3_key = photo_service.presign_photo_upload(profile, payload.content_type)
    return PhotoPresignOut(upload_url=upload_url, s3_key=s3_key)


@router.post(
    "/me/photos/confirm", response_model=PhotoOut, status_code=status.HTTP_201_CREATED
)
def confirm_my_photo(
    payload: PhotoConfirmIn,
    profile: CurrentProfileDependency,
    db: DbDependency,
) -> ProfilePhoto:
    return photo_service.confirm_photo(db, profile, payload.s3_key, payload.position)


@router.get("/{profile_id}", response_model=PublicProfileOut)
def get_public_profile(profile_id: uuid.UUID, db: DbDependency) -> PublicProfileOut:
    profile = profile_service.get_profile_by_id(db, profile_id)
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return profile_service.to_public_profile(db, profile)
