"""Real tests for the matches feature: listing and unmatch semantics."""
from __future__ import annotations

import uuid

from sqlalchemy.orm import Session as DbSession

from packages.api.features.matches.match_service import (
    NotAMatchParticipantError,
    get_or_create_match_for_pair,
    list_active_matches_for_profile,
    other_profile_id,
    unmatch,
)
from packages.api.features.matches.models import Match


def test_get_or_create_match_is_normalized_and_single_row(db: DbSession, make_profile) -> None:
    a = make_profile()
    b = make_profile()

    match_ab = get_or_create_match_for_pair(db, a.id, b.id)
    db.commit()
    match_ba = get_or_create_match_for_pair(db, b.id, a.id)
    db.commit()

    assert match_ab.id == match_ba.id
    assert db.query(Match).count() == 1
    assert match_ab.profile_a_id == min(a.id, b.id)
    assert match_ab.profile_b_id == max(a.id, b.id)


def test_list_active_matches_excludes_inactive(db: DbSession, make_profile) -> None:
    me = make_profile()
    other1 = make_profile()
    other2 = make_profile()

    active = get_or_create_match_for_pair(db, me.id, other1.id)
    inactive = get_or_create_match_for_pair(db, me.id, other2.id)
    db.commit()
    inactive.is_active = False
    db.commit()

    results = list_active_matches_for_profile(db, me.id)

    assert [m.id for m in results] == [active.id]


def test_unmatch_sets_inactive_not_deleted(db: DbSession, make_profile) -> None:
    a = make_profile()
    b = make_profile()
    match = get_or_create_match_for_pair(db, a.id, b.id)
    db.commit()
    match_id = match.id

    result = unmatch(db, match_id, a.id)

    assert result is not None
    assert result.is_active is False
    # row still exists in the table -- not hard-deleted.
    row = db.get(Match, match_id)
    assert row is not None
    assert row.is_active is False


def test_unmatch_rejects_non_participant(db: DbSession, make_profile) -> None:
    a = make_profile()
    b = make_profile()
    stranger = make_profile()
    match = get_or_create_match_for_pair(db, a.id, b.id)
    db.commit()

    raised = False
    try:
        unmatch(db, match.id, stranger.id)
    except NotAMatchParticipantError:
        raised = True
    assert raised
    assert db.get(Match, match.id).is_active is True


def test_unmatch_unknown_match_returns_none(db: DbSession, make_profile) -> None:
    a = make_profile()
    assert unmatch(db, uuid.uuid4(), a.id) is None


def test_other_profile_id(db: DbSession, make_profile) -> None:
    a = make_profile()
    b = make_profile()
    match = get_or_create_match_for_pair(db, a.id, b.id)
    db.commit()

    assert other_profile_id(match, a.id) == b.id
    assert other_profile_id(match, b.id) == a.id


def test_matches_endpoint_lists_active_matches(
    client, as_profile, db: DbSession, make_profile
) -> None:
    me = make_profile()
    other = make_profile()
    get_or_create_match_for_pair(db, me.id, other.id)
    db.commit()
    as_profile(me)

    response = client.get("/matches")

    assert response.status_code == 200
    body = response.json()
    assert len(body["matches"]) == 1
    assert body["matches"][0]["profile"]["id"] == str(other.id)
    assert body["matches"][0]["profile"]["display_name"] == other.display_name
    assert body["matches"][0]["is_active"] is True
    assert body["matches"][0]["conversation_id"]


def test_matches_endpoint_conversation_id_is_stable_across_calls(
    client, as_profile, db: DbSession, make_profile
) -> None:
    """Integration-step addition: `GET /matches` resolves each match's
    conversation lazily (get-or-create, same policy as `GET
    /conversations`) -- repeat calls must return the same conversation id,
    not create a new one each time."""
    me = make_profile()
    other = make_profile()
    get_or_create_match_for_pair(db, me.id, other.id)
    db.commit()
    as_profile(me)

    first = client.get("/matches").json()["matches"][0]["conversation_id"]
    second = client.get("/matches").json()["matches"][0]["conversation_id"]

    assert first == second


def test_unmatch_endpoint_sets_inactive_and_returns_204(
    client, as_profile, db: DbSession, make_profile
) -> None:
    me = make_profile()
    other = make_profile()
    match = get_or_create_match_for_pair(db, me.id, other.id)
    db.commit()
    match_id = match.id
    as_profile(me)

    response = client.post(f"/matches/{match_id}/unmatch")

    assert response.status_code == 204
    # The request was served by a different Session instance (overridden
    # `get_db` per-request); expire our own session's identity map so this
    # read reflects that other session's commit instead of a stale cache.
    db.expire_all()
    row = db.get(Match, match_id)
    assert row is not None
    assert row.is_active is False


def test_unmatch_endpoint_forbidden_for_non_participant(
    client, as_profile, db: DbSession, make_profile
) -> None:
    a = make_profile()
    b = make_profile()
    stranger = make_profile()
    match = get_or_create_match_for_pair(db, a.id, b.id)
    db.commit()
    as_profile(stranger)

    response = client.post(f"/matches/{match.id}/unmatch")

    assert response.status_code == 403


def test_unmatch_endpoint_404_for_unknown_match(
    client, as_profile, db: DbSession, make_profile
) -> None:
    me = make_profile()
    as_profile(me)

    response = client.post(f"/matches/{uuid.uuid4()}/unmatch")

    assert response.status_code == 404
