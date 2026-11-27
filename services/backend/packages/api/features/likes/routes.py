"""Likes feature routes.

`POST /likes` and `GET /likes/quota`, per the endpoint contract in
tasks/0008-mvp-feature-completion/plan.md. `GET /likes/incoming` ("see
who liked you") was added in task 0012, subtask B8.
"""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session as DbSession

from packages.api.core.database import get_db
from packages.api.features.auth.dependencies import get_current_profile
from packages.api.features.likes import like_service, quota_service
from packages.api.features.likes.like_service import (
    LikeQuotaExceededError,
    SelfLikeError,
    create_like,
)
from packages.api.features.likes.schemas import (
    IncomingLikeItem,
    IncomingLikesResponse,
    LikeCreateRequest,
    LikeCreateResponse,
    LikeQuotaResponse,
    LikerProfileSummary,
)
from packages.api.features.profiles import photo_service
from packages.api.features.profiles.models import Profile
from packages.api.features.subscriptions.subscriptions_service import has_active_premium

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


@router.get("/incoming", response_model=IncomingLikesResponse)
def get_incoming_likes(
    profile: CurrentProfileDependency, db: DbDependency
) -> IncomingLikesResponse:
    """See who liked you (task 0012, subtask B8).

    Premium callers (`has_active_premium(db, user_id)`) get the full list:
    each liker's profile summary (display name + primary photo URL,
    resolved via `profiles.photo_service`) plus the like's timestamp.

    Free callers get a count-only teaser: just the number of incoming
    likes, with `likes` always `[]` -- no liker's profile_id, display
    name, or photo is ever included in the free response body, per
    `docs/product-plan.md` Module 6.
    """
    count = like_service.count_incoming_likes(db, profile.id)

    if not has_active_premium(db, profile.user_id):
        return IncomingLikesResponse(is_premium=False, count=count, likes=[])

    rows = like_service.list_incoming_likes(db, profile.id)
    items = [
        IncomingLikeItem(
            profile=LikerProfileSummary(
                id=liker_profile.id,
                display_name=liker_profile.display_name,
                photo_url=photo_service.primary_photo_url(list(liker_profile.photos)),
            ),
            liked_at=like.created_at,
        )
        for like, liker_profile in rows
    ]
    return IncomingLikesResponse(is_premium=True, count=count, likes=items)
