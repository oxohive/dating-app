"""Message service: send/list messages within a conversation.

Pagination decision (documented — see subtask B3 in
tasks/0008-mvp-feature-completion/plan.md): `list_messages` returns
messages **newest-first** (descending by `created_at`). `before` is an
optional ISO-8601 timestamp cursor meaning "only messages created strictly
before this timestamp"; a client calls once with no `before` to get the
latest page, then passes the `created_at` of the oldest message it received
as the next page's `before` to walk further back in history. This matches
the common "infinite scroll up" chat pattern without needing a separate
opaque cursor token.

Block enforcement (documented — minimum enforced this wave): sending a
message is rejected with 403 if either participant has blocked the other,
in either direction. Reading history is still allowed after a block so a
user can see what was said before blocking; only new messages are
prevented.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from packages.api.features.messaging.models import Conversation, Message
from packages.api.features.notifications import notification_service
from packages.api.features.safety.models import Block

logger = logging.getLogger(__name__)

DEFAULT_LIMIT = 50
MAX_LIMIT = 100


def _is_blocked(db: Session, profile_a: uuid.UUID, profile_b: uuid.UUID) -> bool:
    """True if either profile has blocked the other, in either direction."""
    blocked = db.scalar(
        select(Block.id).where(
            or_(
                (Block.blocker_profile_id == profile_a)
                & (Block.blocked_profile_id == profile_b),
                (Block.blocker_profile_id == profile_b)
                & (Block.blocked_profile_id == profile_a),
            )
        )
    )
    return blocked is not None


def list_messages(
    db: Session,
    conversation: Conversation,
    limit: int = DEFAULT_LIMIT,
    before: datetime | None = None,
) -> list[Message]:
    """Return up to `limit` messages, newest-first, optionally before a cursor."""
    limit = max(1, min(limit, MAX_LIMIT))

    stmt = select(Message).where(Message.conversation_id == conversation.id)
    if before is not None:
        stmt = stmt.where(Message.created_at < before)
    stmt = stmt.order_by(Message.created_at.desc()).limit(limit)

    return list(db.scalars(stmt).all())


def send_message(
    db: Session,
    conversation: Conversation,
    sender_profile_id: uuid.UUID,
    recipient_profile_id: uuid.UUID,
    content: str,
) -> Message:
    """Create and persist a message, enforcing the block rule above."""
    if _is_blocked(db, sender_profile_id, recipient_profile_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot message a blocked profile",
        )

    message = Message(
        conversation_id=conversation.id,
        sender_profile_id=sender_profile_id,
        content=content,
    )
    db.add(message)
    db.commit()
    db.refresh(message)

    try:
        notification_service.notify_new_message(recipient_profile_id, message.id)
    except Exception:  # pragma: no cover - notification stub must never break sends
        logger.exception("Failed to dispatch new-message notification")

    return message
