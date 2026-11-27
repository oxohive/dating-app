"""Real tests for the notifications HTTP routes: push-token
register/unregister and notification-preference get/update.
"""
from __future__ import annotations

from sqlalchemy.orm import Session as DbSession

from packages.api.features.notifications.models import NotificationPreference, PushToken

from .conftest import make_user

# --- push tokens -------------------------------------------------------


def test_register_push_token_creates_row(client, as_user, db: DbSession) -> None:
    user = make_user(db)
    as_user(user)

    response = client.post(
        "/notifications/push-tokens", json={"token": "expo-token-123", "platform": "ios"}
    )

    assert response.status_code == 201
    body = response.json()
    assert body["token"] == "expo-token-123"
    assert body["platform"] == "ios"
    assert db.query(PushToken).filter_by(token="expo-token-123", user_id=user.id).count() == 1


def test_register_push_token_rejects_invalid_platform(client, as_user, db: DbSession) -> None:
    user = make_user(db)
    as_user(user)

    response = client.post(
        "/notifications/push-tokens", json={"token": "tok", "platform": "windows_phone"}
    )

    assert response.status_code == 400


def test_register_push_token_reregistering_same_token_reowns_it(
    client, as_user, db: DbSession
) -> None:
    """A device reused after a reinstall under a different account should
    re-own the token rather than erroring on the unique constraint."""
    user_a = make_user(db)
    user_b = make_user(db)

    as_user(user_a)
    client.post("/notifications/push-tokens", json={"token": "shared-device", "platform": "ios"})

    as_user(user_b)
    response = client.post(
        "/notifications/push-tokens", json={"token": "shared-device", "platform": "android"}
    )

    assert response.status_code == 201
    assert db.query(PushToken).filter_by(token="shared-device").count() == 1
    row = db.query(PushToken).filter_by(token="shared-device").one()
    assert row.user_id == user_b.id
    assert row.platform == "android"


def test_unregister_push_token_deletes_owned_token(client, as_user, db: DbSession) -> None:
    user = make_user(db)
    db.add(PushToken(user_id=user.id, token="to-remove", platform="android"))
    db.commit()
    as_user(user)

    response = client.request(
        "DELETE", "/notifications/push-tokens", json={"token": "to-remove"}
    )

    assert response.status_code == 204
    assert db.query(PushToken).filter_by(token="to-remove").count() == 0


def test_unregister_push_token_404_when_not_owned(client, as_user, db: DbSession) -> None:
    owner = make_user(db)
    stranger = make_user(db)
    db.add(PushToken(user_id=owner.id, token="someone-elses", platform="ios"))
    db.commit()
    as_user(stranger)

    response = client.request(
        "DELETE", "/notifications/push-tokens", json={"token": "someone-elses"}
    )

    assert response.status_code == 404
    assert db.query(PushToken).filter_by(token="someone-elses").count() == 1


def test_unregister_push_token_404_when_unknown(client, as_user, db: DbSession) -> None:
    user = make_user(db)
    as_user(user)

    response = client.request(
        "DELETE", "/notifications/push-tokens", json={"token": "never-existed"}
    )

    assert response.status_code == 404


def test_push_token_endpoints_require_authentication(client) -> None:
    response = client.post(
        "/notifications/push-tokens", json={"token": "tok", "platform": "ios"}
    )
    assert response.status_code in (401, 403)


# --- notification preferences ------------------------------------------


def test_get_preferences_creates_default_row_on_first_read(client, as_user, db: DbSession) -> None:
    user = make_user(db)
    as_user(user)
    assert db.query(NotificationPreference).count() == 0

    response = client.get("/notifications/preferences")

    assert response.status_code == 200
    body = response.json()
    assert body["new_like"] is True
    assert body["new_match"] is True
    assert body["new_message"] is True
    assert body["verification_result"] is True
    assert body["subscription_events"] is True
    assert "security_alert" not in body  # never represented -- not user-disable-able
    assert db.query(NotificationPreference).filter_by(user_id=user.id).count() == 1


def test_update_preferences_partial_update_only_changes_given_fields(
    client, as_user, db: DbSession
) -> None:
    user = make_user(db)
    as_user(user)
    client.get("/notifications/preferences")  # create the default row

    response = client.put("/notifications/preferences", json={"new_like": False})

    assert response.status_code == 200
    body = response.json()
    assert body["new_like"] is False
    assert body["new_match"] is True
    assert body["new_message"] is True


def test_update_preferences_creates_row_if_missing(client, as_user, db: DbSession) -> None:
    user = make_user(db)
    as_user(user)
    assert db.query(NotificationPreference).count() == 0

    response = client.put("/notifications/preferences", json={"new_match": False})

    assert response.status_code == 200
    assert response.json()["new_match"] is False
    assert db.query(NotificationPreference).filter_by(user_id=user.id).count() == 1


def test_preferences_are_isolated_per_user(client, as_user, db: DbSession) -> None:
    user_a = make_user(db)
    user_b = make_user(db)

    as_user(user_a)
    client.put("/notifications/preferences", json={"new_like": False})

    as_user(user_b)
    response = client.get("/notifications/preferences")

    assert response.json()["new_like"] is True


def test_preferences_endpoints_require_authentication(client) -> None:
    response = client.get("/notifications/preferences")
    assert response.status_code in (401, 403)
