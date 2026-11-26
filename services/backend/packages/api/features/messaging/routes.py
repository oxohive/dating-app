"""Messaging feature routes.

Mounted with no extra prefix by `packages.api.main`, so the live paths are
the bare `/conversations` / `/conversations/{id}/messages` named in
`tasks/0008-mvp-feature-completion/plan.md`'s endpoint-contract section
(integration-step fix: this router used to be mounted at `/messaging`,
which M2's mobile-facing paths never expected -- see that task's "Known
gaps to reconcile" #5).

See `conversation_service.py` for the conversation lazy-creation policy and
`message_service.py` for the pagination/ordering contract.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from packages.api.core.database import get_db
from packages.api.features.auth.dependencies import get_current_profile
from packages.api.features.messaging import conversation_service, message_service
from packages.api.features.messaging.schemas import ConversationOut, MessageCreate, MessageOut

# Cross-feature import (integration step, per plan.md's cross-feature-model
# -import rule): resolving `participant_display_name`/`participant_photo_url`
# requires joining through the conversation's match to the other `Profile`.
from packages.api.features.profiles import photo_service
from packages.api.features.profiles.models import Profile

router = APIRouter()

DbSession = Annotated[Session, Depends(get_db)]
CurrentProfile = Annotated[Profile, Depends(get_current_profile)]


@router.get("/conversations", response_model=list[ConversationOut])
def list_conversations(
    db: DbSession,
    current_profile: CurrentProfile,
) -> list[ConversationOut]:
    """List conversations for the current profile, derived from active matches."""
    pairs = conversation_service.list_conversations_for_profile(db, current_profile.id)
    items: list[ConversationOut] = []
    for conversation, other_profile_id in pairs:
        other_profile = db.get(Profile, other_profile_id)
        last_message = next(
            iter(message_service.list_messages(db, conversation, limit=1)), None
        )
        items.append(
            ConversationOut(
                id=conversation.id,
                match_id=conversation.match_id,
                participant_profile_id=other_profile_id,
                participant_display_name=(
                    other_profile.display_name if other_profile is not None else ""
                ),
                participant_photo_url=(
                    photo_service.primary_photo_url(list(other_profile.photos))
                    if other_profile is not None
                    else None
                ),
                last_message_preview=last_message.content if last_message is not None else None,
                last_message_at=last_message.created_at if last_message is not None else None,
                created_at=conversation.created_at,
            )
        )
    return items


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageOut])
def list_messages(
    conversation_id: uuid.UUID,
    db: DbSession,
    current_profile: CurrentProfile,
    limit: Annotated[
        int, Query(ge=1, le=message_service.MAX_LIMIT)
    ] = message_service.DEFAULT_LIMIT,
    before: Annotated[datetime | None, Query()] = None,
) -> list[MessageOut]:
    """Paginated message history, newest-first. See message_service for the cursor contract."""
    conversation, _match = conversation_service.get_authorized_conversation(
        db, conversation_id, current_profile.id
    )
    messages = message_service.list_messages(db, conversation, limit=limit, before=before)
    return [MessageOut.model_validate(message) for message in messages]


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=MessageOut,
    status_code=status.HTTP_201_CREATED,
)
def post_message(
    conversation_id: uuid.UUID,
    body: MessageCreate,
    db: DbSession,
    current_profile: CurrentProfile,
) -> MessageOut:
    """Send a message. 403 if not a match participant, 403 if either side has blocked."""
    conversation, match = conversation_service.get_authorized_conversation(
        db, conversation_id, current_profile.id
    )
    recipient_profile_id = (
        match.profile_b_id if match.profile_a_id == current_profile.id else match.profile_a_id
    )
    message = message_service.send_message(
        db,
        conversation,
        sender_profile_id=current_profile.id,
        recipient_profile_id=recipient_profile_id,
        content=body.content,
    )
    return MessageOut.model_validate(message)
