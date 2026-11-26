"""Messaging ORM models: Conversation, Message.

Bind to `packages.api.core.database.Base`, the single shared declarative
base/metadata. Per the cross-feature-model-import rule in
`tasks/0008-mvp-feature-completion/plan.md`, this module OWNS the
`conversations` and `messages` tables and is the only place either gets
mapped — other features must import `Conversation`/`Message` from here
rather than redefining them.

`Conversation.match_id` references `matches.id` (owned by
`packages.api.features.discovery.models`) and `Message.sender_profile_id`
references `profiles.id` (owned by `packages.api.features.profiles.models`)
via bare `ForeignKey` strings only — this module never imports those ORM
classes, since it has no need to query them directly (the routes/service
layer imports `Match`/`Profile` where a query is actually needed).
"""
from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from packages.api.core.database import Base


def _utcnow() -> datetime:
    return datetime.now(UTC)


class Conversation(Base):
    """A single conversation thread tied 1:1 to an active `Match`."""

    __tablename__ = "conversations"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    match_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("matches.id"), nullable=False, unique=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )

    messages: Mapped[list[Message]] = relationship(
        "Message",
        back_populates="conversation",
        order_by="Message.created_at",
        cascade="all, delete-orphan",
    )


class Message(Base):
    """A single text message within a `Conversation`."""

    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("conversations.id"), nullable=False, index=True
    )
    sender_profile_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("profiles.id"), nullable=False, index=True
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False, index=True
    )
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    conversation: Mapped[Conversation] = relationship("Conversation", back_populates="messages")
