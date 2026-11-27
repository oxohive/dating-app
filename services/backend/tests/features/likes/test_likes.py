"""Real tests for the likes feature: quota enforcement, duplicate handling,
mutual-like match creation, and "see who liked you" (task 0012, B8).
"""
from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session as DbSession

from packages.api.features.likes.like_service import (
    LikeQuotaExceededError,
    SelfLikeError,
    create_like,
)
from packages.api.features.likes.models import Like
from packages.api.features.likes.quota_service import (
    DAILY_LIKE_LIMIT,
    count_used_today,
    quota_status,
)
from packages.api.features.matches.models import Match
from packages.api.features.subscriptions.models import Subscription


def _backfill_likes(db: DbSession, make_profile, from_profile_id, count: int) -> None:
    """Insert `count` already-used-up likes for today, each to a fresh target."""
    for _ in range(count):
        target = make_profile()
        db.add(Like(from_profile_id=from_profile_id, to_profile_id=target.id))
    db.commit()


def test_quota_allows_exactly_at_limit(db: DbSession, make_profile) -> None:
    me = make_profile()
    _backfill_likes(db, make_profile, me.id, DAILY_LIKE_LIMIT - 1)
    assert count_used_today(db, me.id) == DAILY_LIKE_LIMIT - 1

    target = make_profile()
    result = create_like(db, me.id, target.id)  # this is the 20th like

    assert result.like_id is not None
    assert count_used_today(db, me.id) == DAILY_LIKE_LIMIT


def test_quota_blocks_once_over_limit(db: DbSession, make_profile) -> None:
    me = make_profile()
    _backfill_likes(db, make_profile, me.id, DAILY_LIKE_LIMIT)
    assert count_used_today(db, me.id) == DAILY_LIKE_LIMIT

    target = make_profile()
    try:
        create_like(db, me.id, target.id)
        raised = False
    except LikeQuotaExceededError:
        raised = True

    assert raised
    assert count_used_today(db, me.id) == DAILY_LIKE_LIMIT  # no extra row created


def test_quota_resets_after_utc_midnight(db: DbSession, make_profile) -> None:
    me = make_profile()
    yesterday_target = make_profile()
    yesterday = datetime.now(UTC) - timedelta(days=1)
    db.add(
        Like(from_profile_id=me.id, to_profile_id=yesterday_target.id, created_at=yesterday)
    )
    db.commit()

    assert count_used_today(db, me.id) == 0
    status = quota_status(db, me.id)
    assert status["used"] == 0
    assert status["limit"] == DAILY_LIKE_LIMIT


def test_self_like_rejected(db: DbSession, make_profile) -> None:
    me = make_profile()
    try:
        create_like(db, me.id, me.id)
        raised = False
    except SelfLikeError:
        raised = True
    assert raised


def test_duplicate_like_is_idempotent(db: DbSession, make_profile) -> None:
    me = make_profile()
    target = make_profile()

    first = create_like(db, me.id, target.id)
    second = create_like(db, me.id, target.id)

    assert first.like_id == second.like_id
    rows = db.query(Like).filter_by(from_profile_id=me.id, to_profile_id=target.id).all()
    assert len(rows) == 1


def test_mutual_like_creates_single_match_order_a_then_b(db: DbSession, make_profile) -> None:
    a = make_profile()
    b = make_profile()

    first = create_like(db, a.id, b.id)
    assert first.matched is False

    second = create_like(db, b.id, a.id)
    assert second.matched is True
    assert second.match_id is not None

    matches = db.query(Match).all()
    assert len(matches) == 1


def test_mutual_like_creates_single_match_order_b_then_a(db: DbSession, make_profile) -> None:
    a = make_profile()
    b = make_profile()

    first = create_like(db, b.id, a.id)
    assert first.matched is False

    second = create_like(db, a.id, b.id)
    assert second.matched is True
    assert second.match_id is not None

    matches = db.query(Match).all()
    assert len(matches) == 1
    # normalized pair ordering: smaller UUID always profile_a_id
    match = matches[0]
    assert match.profile_a_id == min(a.id, b.id)
    assert match.profile_b_id == max(a.id, b.id)


def test_like_endpoint_quota_exceeded_returns_403(
    client, as_profile, db: DbSession, make_profile
) -> None:
    me = make_profile()
    _backfill_likes(db, make_profile, me.id, DAILY_LIKE_LIMIT)
    target = make_profile()
    as_profile(me)

    response = client.post("/likes", json={"to_profile_id": str(target.id)})

    assert response.status_code == 403
    assert response.json() == {"error": "quota_exceeded"}


def test_like_endpoint_creates_match_on_mutual_like(
    client, as_profile, db: DbSession, make_profile
) -> None:
    a = make_profile()
    b = make_profile()

    as_profile(a)
    first = client.post("/likes", json={"to_profile_id": str(b.id)})
    assert first.status_code == 201
    assert first.json()["matched"] is False

    as_profile(b)
    second = client.post("/likes", json={"to_profile_id": str(a.id)})
    assert second.status_code == 201
    body = second.json()
    assert body["matched"] is True
    assert body["match_id"] is not None


def test_quota_endpoint_reports_usage(
    client, as_profile, db: DbSession, make_profile
) -> None:
    me = make_profile()
    _backfill_likes(db, make_profile, me.id, 3)
    as_profile(me)

    response = client.get("/likes/quota")

    assert response.status_code == 200
    body = response.json()
    assert body["used"] == 3
    assert body["limit"] == DAILY_LIKE_LIMIT
    assert "resets_at" in body


# --- GET /likes/incoming ("see who liked you") ------------------------------


def _grant_active_premium(db: DbSession, user_id) -> None:
    db.add(
        Subscription(
            user_id=user_id,
            plan="monthly",
            status="active",
            started_at=datetime.now(UTC),
            expires_at=datetime.now(UTC) + timedelta(days=30),
        )
    )
    db.commit()


def test_incoming_likes_free_user_gets_count_only_no_identities(
    client, as_profile, db: DbSession, make_profile
) -> None:
    me = make_profile()
    liker_a = make_profile(display_name="Liker A")
    liker_b = make_profile(display_name="Liker B")
    db.add(Like(from_profile_id=liker_a.id, to_profile_id=me.id))
    db.add(Like(from_profile_id=liker_b.id, to_profile_id=me.id))
    db.commit()
    as_profile(me)

    response = client.get("/likes/incoming")

    assert response.status_code == 200
    body = response.json()
    assert body["is_premium"] is False
    assert body["count"] == 2
    # No liker identity at all -- not profile_id, not display_name, not
    # photo_url -- must leak into the free response body.
    assert body["likes"] == []
    raw_text = response.text
    assert "Liker A" not in raw_text
    assert "Liker B" not in raw_text
    assert str(liker_a.id) not in raw_text
    assert str(liker_b.id) not in raw_text


def test_incoming_likes_premium_user_gets_full_list(
    client, as_profile, db: DbSession, make_profile
) -> None:
    me = make_profile()
    _grant_active_premium(db, me.user_id)
    liker = make_profile(display_name="Liker A")
    db.add(Like(from_profile_id=liker.id, to_profile_id=me.id))
    db.commit()
    as_profile(me)

    response = client.get("/likes/incoming")

    assert response.status_code == 200
    body = response.json()
    assert body["is_premium"] is True
    assert body["count"] == 1
    assert len(body["likes"]) == 1
    item = body["likes"][0]
    assert item["profile"]["id"] == str(liker.id)
    assert item["profile"]["display_name"] == "Liker A"
    assert "liked_at" in item


def test_incoming_likes_zero_when_nobody_has_liked_me(
    client, as_profile, db: DbSession, make_profile
) -> None:
    me = make_profile()
    as_profile(me)

    response = client.get("/likes/incoming")

    assert response.status_code == 200
    body = response.json()
    assert body["is_premium"] is False
    assert body["count"] == 0
    assert body["likes"] == []


def test_incoming_likes_does_not_include_likes_i_sent(
    client, as_profile, db: DbSession, make_profile
) -> None:
    me = make_profile()
    _grant_active_premium(db, me.user_id)
    other = make_profile()
    # I liked `other` -- this must not show up as an incoming like to me.
    db.add(Like(from_profile_id=me.id, to_profile_id=other.id))
    db.commit()
    as_profile(me)

    response = client.get("/likes/incoming")

    assert response.status_code == 200
    body = response.json()
    assert body["count"] == 0
    assert body["likes"] == []


def test_incoming_likes_requires_auth(client) -> None:
    response = client.get("/likes/incoming")
    assert response.status_code == 401
