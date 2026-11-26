"""Real tests for the discovery feature: feed filtering and pass recording.

Exercises discovery_service directly against a real (in-memory SQLite)
schema built from the actual auth/profiles/safety models (B1/B3), per the
shared contract in tasks/0008-mvp-feature-completion/plan.md.
"""
from __future__ import annotations

from sqlalchemy.orm import Session as DbSession

from packages.api.features.discovery.discovery_service import get_feed, record_pass
from packages.api.features.discovery.models import Pass
from packages.api.features.likes.models import Like
from packages.api.features.safety.models import Block


def test_feed_excludes_self(db: DbSession, make_profile) -> None:
    me = make_profile(city="Mumbai")

    results = get_feed(db, me)

    assert me.id not in {p.id for p in results}


def test_feed_excludes_different_city(db: DbSession, make_profile) -> None:
    me = make_profile(city="Mumbai")
    other_city = make_profile(city="Delhi")

    results = get_feed(db, me)

    assert other_city.id not in {p.id for p in results}


def test_feed_excludes_inactive_accounts(db: DbSession, make_profile) -> None:
    me = make_profile(city="Mumbai")
    inactive = make_profile(city="Mumbai", is_active=False)

    results = get_feed(db, me)

    assert inactive.id not in {p.id for p in results}


def test_feed_excludes_already_liked(db: DbSession, make_profile) -> None:
    me = make_profile(city="Mumbai")
    liked = make_profile(city="Mumbai")
    candidate = make_profile(city="Mumbai")

    db.add(Like(from_profile_id=me.id, to_profile_id=liked.id))
    db.commit()

    results = get_feed(db, me)
    result_ids = {p.id for p in results}

    assert liked.id not in result_ids
    assert candidate.id in result_ids


def test_feed_excludes_already_passed(db: DbSession, make_profile) -> None:
    me = make_profile(city="Mumbai")
    passed = make_profile(city="Mumbai")
    candidate = make_profile(city="Mumbai")

    db.add(Pass(from_profile_id=me.id, to_profile_id=passed.id))
    db.commit()

    results = get_feed(db, me)
    result_ids = {p.id for p in results}

    assert passed.id not in result_ids
    assert candidate.id in result_ids


def test_feed_excludes_blocked_either_direction(db: DbSession, make_profile) -> None:
    me = make_profile(city="Mumbai")
    i_blocked = make_profile(city="Mumbai")
    blocked_me = make_profile(city="Mumbai")
    candidate = make_profile(city="Mumbai")

    db.add(Block(blocker_profile_id=me.id, blocked_profile_id=i_blocked.id))
    db.add(Block(blocker_profile_id=blocked_me.id, blocked_profile_id=me.id))
    db.commit()

    results = get_feed(db, me)
    result_ids = {p.id for p in results}

    assert i_blocked.id not in result_ids
    assert blocked_me.id not in result_ids
    assert candidate.id in result_ids


def test_feed_orders_more_complete_profiles_first(db: DbSession, make_profile) -> None:
    me = make_profile(city="Mumbai")
    sparse = make_profile(city="Mumbai", bio=None, interests=None)
    complete = make_profile(city="Mumbai", bio="Hello world", interests=["hiking", "coffee"])

    results = get_feed(db, me)
    result_ids = [p.id for p in results]

    assert result_ids.index(complete.id) < result_ids.index(sparse.id)


def test_feed_pagination_limit_and_offset(db: DbSession, make_profile) -> None:
    me = make_profile(city="Mumbai")
    for _ in range(5):
        make_profile(city="Mumbai")

    first_page = get_feed(db, me, limit=2, offset=0)
    second_page = get_feed(db, me, limit=2, offset=2)

    assert len(first_page) == 2
    assert len(second_page) == 2
    assert {p.id for p in first_page}.isdisjoint({p.id for p in second_page})


def test_record_pass_is_idempotent(db: DbSession, make_profile) -> None:
    me = make_profile(city="Mumbai")
    target = make_profile(city="Mumbai")

    record_pass(db, me.id, target.id)
    record_pass(db, me.id, target.id)
    record_pass(db, me.id, target.id)

    rows = db.query(Pass).filter_by(from_profile_id=me.id, to_profile_id=target.id).all()
    assert len(rows) == 1


def test_discovery_pass_endpoint_is_idempotent_204(
    client, as_profile, db: DbSession, make_profile
) -> None:
    me = make_profile(city="Mumbai")
    target = make_profile(city="Mumbai")
    as_profile(me)

    first = client.post("/discovery/pass", json={"to_profile_id": str(target.id)})
    second = client.post("/discovery/pass", json={"to_profile_id": str(target.id)})

    assert first.status_code == 204
    assert second.status_code == 204
    rows = db.query(Pass).filter_by(from_profile_id=me.id, to_profile_id=target.id).all()
    assert len(rows) == 1


def test_discovery_feed_endpoint_returns_filtered_profiles(
    client, as_profile, db: DbSession, make_profile
) -> None:
    me = make_profile(city="Mumbai")
    candidate = make_profile(city="Mumbai")
    make_profile(city="Delhi")  # different city, excluded
    as_profile(me)

    response = client.get("/discovery/feed?limit=10&offset=0")

    assert response.status_code == 200
    body = response.json()
    returned_ids = {p["id"] for p in body["profiles"]}
    assert str(candidate.id) in returned_ids
    assert body["next_offset"] == len(body["profiles"])


def test_discovery_feed_endpoint_includes_age_and_photo_urls(
    client, as_profile, db: DbSession, make_profile
) -> None:
    """Integration-step reconciliation: a swipeable card needs a computed
    `age` and resolved `photo_urls`, not just Profile's own fields -- see
    `discovery_service.to_discovery_profile_out`."""
    me = make_profile(city="Mumbai")
    make_profile(city="Mumbai")
    as_profile(me)

    response = client.get("/discovery/feed")

    assert response.status_code == 200
    body = response.json()
    assert len(body["profiles"]) == 1
    item = body["profiles"][0]
    assert "age" in item
    assert item["photo_urls"] == []
