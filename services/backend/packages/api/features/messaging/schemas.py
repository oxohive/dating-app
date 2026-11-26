"""Messaging request/response schemas."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ConversationOut(BaseModel):
    """A conversation thread, as returned by `GET /conversations`.

    Integration-step addition (see tasks/0008-mvp-feature-completion's
    "Known gaps to reconcile" #4): the original shape only carried
    `other_profile_id`, but M2's mobile `ConversationListItem`/
    `useConversation` need the other participant's display name (and
    ideally a photo / last-message preview) to render an inbox row at all.
    `other_profile_id` is renamed to `participant_profile_id` to match the
    mobile contract exactly; `participant_display_name`/
    `participant_photo_url` are resolved via a join through the
    conversation's match to the other `Profile`.
    """

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    match_id: uuid.UUID
    participant_profile_id: uuid.UUID
    participant_display_name: str
    participant_photo_url: str | None = None
    last_message_preview: str | None = None
    last_message_at: datetime | None = None
    created_at: datetime


class MessageOut(BaseModel):
    """A single message, as returned by the message list/create endpoints."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    conversation_id: uuid.UUID
    sender_profile_id: uuid.UUID
    content: str
    created_at: datetime
    read_at: datetime | None = None


class MessageCreate(BaseModel):
    """Body for `POST /conversations/{id}/messages`."""

    content: str = Field(min_length=1, max_length=4000)
