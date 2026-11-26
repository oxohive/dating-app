"""Match request/response schemas.

Integration-step reconciliation (see tasks/0008-mvp-feature-completion's
"Known gaps to reconcile" #3): B2's original `MatchOut` was a flat
`{id, profile_id, is_active, created_at}`, but M2's mobile `matches.api.ts`
was built against a nested `{id, profile: {id, display_name, photo_url},
matched_at, conversation_id}` shape (no runtime validation on the mobile
side means this mismatch would only surface as a crash at render time, not
a type error). Reconciled here on the lower-risk backend side rather than
reworking several already-consistent mobile files; `is_active` is kept
alongside the new fields since it's harmless additional data.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel


class MatchParticipantOut(BaseModel):
    """The *other* participant's public-facing summary for a match row."""

    id: uuid.UUID
    display_name: str
    photo_url: str | None = None


class MatchOut(BaseModel):
    id: uuid.UUID
    profile: MatchParticipantOut
    conversation_id: uuid.UUID
    is_active: bool
    matched_at: datetime


class MatchesListResponse(BaseModel):
    matches: list[MatchOut]
