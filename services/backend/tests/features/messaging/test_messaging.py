"""Real tests for the messaging feature: conversation access control,
lazy conversation creation, message pagination, and block enforcement.
"""
from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session as DbSession

from packages.api.features.messaging import conversation_service, message_service
from packages.api.features.messaging.models import Conversation, Message
from packages.api.features.safety.models import Block

from .conftest import make_match, make_user_and_profile


def test_list_conversations_materializes_one_per_active_match(db: DbSession) -> None:
    me = make_user_and_profile(db)
    other1 = make_user_and_profile(db)
    other2 = make_user_and_profile(db)
    make_match(db, me, other1)
    inactive_match = make_match(db, me, other2)
    inactive_match.is_active = False
    db.commit()

    pairs = conversation_service.list_conversations_for_profile(db, me.id)

    assert len(pairs) == 1
    conversation, other_profile_id = pairs[0]
    assert other_profile_id == other1.id
    # the row was actually persisted (lazy creation), not just returned in memory
    assert db.get(Conversation, conversation.id) is not None


def test_list_conversations_is_idempotent_on_repeat_calls(db: DbSession) -> None:
    me = make_user_and_profile(db)
    other = make_user_and_profile(db)
    make_match(db, me, other)

    first = conversation_service.list_conversations_for_profile(db, me.id)
    second = conversation_service.list_conversations_for_profile(db, me.id)

    assert first[0][0].id == second[0][0].id
    assert db.query(Conversation).count() == 1


def test_get_authorized_conversation_rejects_non_participant(db: DbSession) -> None:
    a = make_user_and_profile(db)
    b = make_user_and_profile(db)
    stranger = make_user_and_profile(db)
    match = make_match(db, a, b)
    conversation = conversation_service.get_or_create_conversation_for_match(db, match)

    with pytest.raises(HTTPException) as exc_info:
        conversation_service.get_authorized_conversation(db, conversation.id, stranger.id)
    assert exc_info.value.status_code == 403


def test_get_authorized_conversation_rejects_inactive_match(db: DbSession) -> None:
    a = make_user_and_profile(db)
    b = make_user_and_profile(db)
    match = make_match(db, a, b)
    conversation = conversation_service.get_or_create_conversation_for_match(db, match)
    match.is_active = False
    db.commit()

    with pytest.raises(HTTPException) as exc_info:
        conversation_service.get_authorized_conversation(db, conversation.id, a.id)
    assert exc_info.value.status_code == 403


def test_get_authorized_conversation_404_for_unknown_id(db: DbSession) -> None:
    import uuid

    a = make_user_and_profile(db)
    with pytest.raises(HTTPException) as exc_info:
        conversation_service.get_authorized_conversation(db, uuid.uuid4(), a.id)
    assert exc_info.value.status_code == 404


def test_send_message_persists_and_is_listed_newest_first(db: DbSession) -> None:
    a = make_user_and_profile(db)
    b = make_user_and_profile(db)
    match = make_match(db, a, b)
    conversation = conversation_service.get_or_create_conversation_for_match(db, match)

    first = message_service.send_message(db, conversation, a.id, b.id, "hello")
    second = message_service.send_message(db, conversation, b.id, a.id, "hi back")

    messages = message_service.list_messages(db, conversation)
    assert [m.id for m in messages] == [second.id, first.id]  # newest-first


def test_list_messages_before_cursor_paginates_older_page(db: DbSession) -> None:
    a = make_user_and_profile(db)
    b = make_user_and_profile(db)
    match = make_match(db, a, b)
    conversation = conversation_service.get_or_create_conversation_for_match(db, match)

    base = datetime.now(UTC)
    older = Message(
        conversation_id=conversation.id,
        sender_profile_id=a.id,
        content="older",
        created_at=base - timedelta(minutes=5),
    )
    newer = Message(
        conversation_id=conversation.id,
        sender_profile_id=b.id,
        content="newer",
        created_at=base,
    )
    db.add_all([older, newer])
    db.commit()

    first_page = message_service.list_messages(db, conversation, limit=1)
    assert [m.id for m in first_page] == [newer.id]

    second_page = message_service.list_messages(
        db, conversation, limit=10, before=first_page[0].created_at
    )
    assert [m.id for m in second_page] == [older.id]


def test_send_message_rejected_when_blocked(db: DbSession) -> None:
    a = make_user_and_profile(db)
    b = make_user_and_profile(db)
    match = make_match(db, a, b)
    conversation = conversation_service.get_or_create_conversation_for_match(db, match)
    db.add(Block(blocker_profile_id=b.id, blocked_profile_id=a.id))
    db.commit()

    with pytest.raises(HTTPException) as exc_info:
        message_service.send_message(db, conversation, a.id, b.id, "hello")
    assert exc_info.value.status_code == 403
    assert db.query(Message).count() == 0


# --- endpoint-level tests -------------------------------------------------


def test_conversations_endpoint_lists_active_matches(client, as_profile, db: DbSession) -> None:
    me = make_user_and_profile(db)
    other = make_user_and_profile(db)
    make_match(db, me, other)
    as_profile(me)

    response = client.get("/conversations")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["participant_profile_id"] == str(other.id)


def test_conversations_endpoint_includes_participant_display_name(
    client, as_profile, db: DbSession
) -> None:
    """Integration-step reconciliation: mobile's inbox list needs the other
    participant's display name (and id, under the mobile-contract field
    name `participant_profile_id`) -- see
    `tasks/0008-mvp-feature-completion`'s "Known gaps to reconcile" #4."""
    me = make_user_and_profile(db, display_name="Me")
    other = make_user_and_profile(db, display_name="Other Person")
    make_match(db, me, other)
    as_profile(me)

    response = client.get("/conversations")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["participant_profile_id"] == str(other.id)
    assert body[0]["participant_display_name"] == "Other Person"


def test_messages_endpoint_requires_match_participant(client, as_profile, db: DbSession) -> None:
    a = make_user_and_profile(db)
    b = make_user_and_profile(db)
    stranger = make_user_and_profile(db)
    match = make_match(db, a, b)
    conversation = conversation_service.get_or_create_conversation_for_match(db, match)
    as_profile(stranger)

    get_response = client.get(f"/conversations/{conversation.id}/messages")
    post_response = client.post(
        f"/conversations/{conversation.id}/messages", json={"content": "hi"}
    )

    assert get_response.status_code == 403
    assert post_response.status_code == 403


def test_messages_endpoint_post_then_get(client, as_profile, db: DbSession) -> None:
    a = make_user_and_profile(db)
    b = make_user_and_profile(db)
    match = make_match(db, a, b)
    conversation = conversation_service.get_or_create_conversation_for_match(db, match)
    as_profile(a)

    post_response = client.post(
        f"/conversations/{conversation.id}/messages", json={"content": "hello there"}
    )
    assert post_response.status_code == 201
    assert post_response.json()["content"] == "hello there"
    assert post_response.json()["sender_profile_id"] == str(a.id)

    get_response = client.get(f"/conversations/{conversation.id}/messages")
    assert get_response.status_code == 200
    body = get_response.json()
    assert len(body) == 1
    assert body[0]["content"] == "hello there"


def test_messages_endpoint_blocked_sender_gets_403(client, as_profile, db: DbSession) -> None:
    a = make_user_and_profile(db)
    b = make_user_and_profile(db)
    match = make_match(db, a, b)
    conversation = conversation_service.get_or_create_conversation_for_match(db, match)
    db.add(Block(blocker_profile_id=b.id, blocked_profile_id=a.id))
    db.commit()
    as_profile(a)

    response = client.post(
        f"/conversations/{conversation.id}/messages", json={"content": "hello"}
    )

    assert response.status_code == 403
