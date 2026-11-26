"""Likes feature routes.

`POST /likes` and `GET /likes/quota`, per the endpoint contract in
tasks/0008-mvp-feature-completion/plan.md.
"""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session as DbSession

from packages.api.core.database import get_db
from packages.api.features.auth.dependencies import get_current_profile
from packages.api.features.likes import quota_service
from packages.api.features.likes.like_service import (
    LikeQuotaExceededError,
    SelfLikeError,
    create_like,
)
from packages.api.features.likes.schemas import (
    LikeCreateRequest,
    LikeCreateResponse,
    LikeQuotaResponse,
)
from packages.api.features.profiles.models import Profile

router = APIRouter()

DbDependency = Annotated[DbSession, Depends(get_db)]
CurrentProfileDependency = Annotated[Profile, Depends(get_current_profile)]


@router.post("", status_code=status.HTTP_201_CREATED, response_model=LikeCreateResponse)
def post_like(
    body: LikeCreateRequest,
    profile: CurrentProfileDependency,
    db: DbDependency,
):
    """Like a profile. 403 `{error: "quota_exceeded"}` once the daily quota is used.

    Idempotent on repeat likes for the same target (see
    `like_service` module docstring for why this is 201, not 409).
    """
    try:
        result = create_like(db, profile.id, body.to_profile_id)
    except SelfLikeError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except LikeQuotaExceededError:
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN, content={"error": "quota_exceeded"}
        )
    return LikeCreateResponse(
        like_id=result.like_id, matched=result.matched, match_id=result.match_id
    )


@router.get("/quota", response_model=LikeQuotaResponse)
def get_like_quota(profile: CurrentProfileDependency, db: DbDependency) -> LikeQuotaResponse:
    """Return the caller's current daily like quota usage."""
    return LikeQuotaResponse(**quota_service.quota_status(db, profile.id))
