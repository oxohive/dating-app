"""Onboarding feature routes: one-time profile creation."""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DbSession

from packages.api.core.database import get_db
from packages.api.features.auth.dependencies import get_current_user
from packages.api.features.auth.models import User
from packages.api.features.onboarding import onboarding_service
from packages.api.features.onboarding.schemas import ProfileCreateIn
from packages.api.features.profiles.schemas import ProfileOut

router = APIRouter()


@router.post("/profile", response_model=ProfileOut, status_code=status.HTTP_201_CREATED)
def post_onboarding_profile(
    payload: ProfileCreateIn,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[DbSession, Depends(get_db)],
) -> ProfileOut:
    try:
        profile = onboarding_service.create_profile(db, user, payload)
    except onboarding_service.ProfileAlreadyExistsError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return profile
