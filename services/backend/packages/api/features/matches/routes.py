"""Matches feature routes.

`GET /matches` and `POST /matches/{match_id}/unmatch`, per the endpoint
contract in tasks/0008-mvp-feature-completion/plan.md.

Integration-step addition: `GET /matches` now also resolves each match's
`conversation_id` (via `messaging.conversation_service`, get-or-creating it
lazily, same policy as `GET /conversations`) and the other participant's
profile summary (via `profiles.models.Profile` + `profiles.photo_service`).
Both are legitimate new cross-feature imports at the integration step, per
plan.md -- matches/messaging/profiles are all landed by this point.
"""
from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DbSession

from packages.api.core.database import get_db
from packages.api.features.auth.dependencies import get_current_profile
from packages.api.features.matches import match_service
from packages.api.features.matches.schemas import MatchesListResponse, MatchOut, MatchParticipantOut
from packages.api.features.messaging import conversation_service
from packages.api.features.profiles import photo_service
from packages.api.features.profiles.models import Profile

router = APIRouter()

DbDependency = Annotated[DbSession, Depends(get_db)]
CurrentProfileDependency = Annotated[Profile, Depends(get_current_profile)]


def _to_match_out(db: DbSession, match, viewer_profile_id: uuid.UUID) -> MatchOut:
    other_id = match_service.other_profile_id(match, viewer_profile_id)
    other_profile = db.get(Profile, other_id)
    participant = MatchParticipantOut(
        id=other_id,
        display_name=other_profile.display_name if other_profile is not None else "",
        photo_url=(
            photo_service.primary_photo_url(list(other_profile.photos))
            if other_profile is not None
            else None
        ),
    )
    conversation = conversation_service.get_or_create_conversation_for_match(db, match)
    return MatchOut(
        id=match.id,
        profile=participant,
        conversation_id=conversation.id,
        is_active=match.is_active,
        matched_at=match.created_at,
    )


@router.get("", response_model=MatchesListResponse)
def get_matches(profile: CurrentProfileDependency, db: DbDependency) -> MatchesListResponse:
    """List the caller's active matches."""
    matches = match_service.list_active_matches_for_profile(db, profile.id)
    items = [_to_match_out(db, m, profile.id) for m in matches]
    return MatchesListResponse(matches=items)


@router.post("/{match_id}/unmatch", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def post_unmatch(match_id: uuid.UUID, profile: CurrentProfileDependency, db: DbDependency) -> None:
    """Unmatch: sets `is_active = False`. Never hard-deletes the row."""
    try:
        match = match_service.unmatch(db, match_id, profile.id)
    except match_service.NotAMatchParticipantError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    if match is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="match not found")
