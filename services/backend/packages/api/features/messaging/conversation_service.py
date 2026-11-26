"""Conversation service: create/list conversations tied to a match.

Conversation lifecycle (documented decision — see
tasks/0008-mvp-feature-completion/plan.md subtask B3): conversations are
**lazily materialized**, never created through a dedicated "create
conversation" endpoint. The first time either `GET /conversations` (for the
owning profile's full list) or a message read/write touches a given active
`Match`, the `Conversation` row for that match is get-or-created on the
spot. A conversation is only ever reachable through an active `Match`
between the two profiles, so this module re-validates that invariant on
every access rather than trusting the `conversations.match_id` FK alone
(a match can be unmatched/deactivated after the conversation row exists).
"""
from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

# DEVIATION (documented in the B3 implementation report): plan.md says
# "B3 imports Match from packages.api.features.discovery.models", but B2
# actually implemented `Match` in packages.api.features.matches.models
# (not discovery.models, which only has `Pass`). Importing from where the
# class actually lives, per the cross-feature-model-import rule's real
# intent (import the owning module, never redefine) rather than the
# plan's stale path.
from packages.api.features.matches.models import Match
from packages.api.features.messaging.models import Conversation


def _other_profile_id(match: Match, viewer_profile_id: uuid.UUID) -> uuid.UUID:
    if match.profile_a_id == viewer_profile_id:
        return match.profile_b_id
    return match.profile_a_id


def _is_participant(match: Match, profile_id: uuid.UUID) -> bool:
    return profile_id in (match.profile_a_id, match.profile_b_id)


def get_or_create_conversation_for_match(db: Session, match: Match) -> Conversation:
    """Return the conversation for `match`, creating it if it doesn't exist yet."""
    conversation = db.scalar(select(Conversation).where(Conversation.match_id == match.id))
    if conversation is not None:
        return conversation

    conversation = Conversation(match_id=match.id)
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation


def list_conversations_for_profile(
    db: Session, profile_id: uuid.UUID
) -> list[tuple[Conversation, uuid.UUID]]:
    """List (conversation, other_profile_id) pairs for every active match.

    Materializes a `Conversation` row for every currently-active match the
    profile is part of that doesn't already have one, then returns all of
    them.
    """
    matches = db.scalars(
        select(Match).where(
            Match.is_active.is_(True),
            or_(Match.profile_a_id == profile_id, Match.profile_b_id == profile_id),
        )
    ).all()

    results: list[tuple[Conversation, uuid.UUID]] = []
    for match in matches:
        conversation = get_or_create_conversation_for_match(db, match)
        results.append((conversation, _other_profile_id(match, profile_id)))
    return results


def get_authorized_conversation(
    db: Session, conversation_id: uuid.UUID, profile_id: uuid.UUID
) -> tuple[Conversation, Match]:
    """Load a conversation and enforce match-membership + active-match rules.

    Raises 404 if the conversation (or its backing match) doesn't exist,
    403 if the caller isn't one of the two matched profiles or the match
    has since been deactivated (unmatched).
    """
    conversation = db.get(Conversation, conversation_id)
    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    match = db.get(Match, conversation.match_id)
    if match is None:
        # Data-integrity edge case: the FK says it exists but it's gone.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    if not _is_participant(match, profile_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a participant")

    if not match.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Match is no longer active"
        )

    return conversation, match
