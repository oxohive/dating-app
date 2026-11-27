"""Self-service account deletion (`POST /auth/account/delete`) tests.

Covers: the happy path (both `is_active`/`deleted_at` flipped, PII
scrubbed), immediate token invalidation, disappearance from the
discovery feed, and -- the single most important case this subtask's
plan calls out -- that a self-deleted account and an admin-suspended
account remain distinguishable via `deleted_at`, since both share the
`is_active` flag.
"""
from __future__ import annotations

import uuid
from collections.abc import Callable
from typing import Any

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession
from sqlalchemy.orm import sessionmaker

from packages.api.features.admin import admin_service
from packages.api.features.auth.models import User
from packages.api.features.discovery import discovery_service
from packages.api.features.profiles.models import Profile
from packages.api.features.profiles.profile_service import DELETED_USER_PLACEHOLDER

ONBOARDING_PAYLOAD: dict[str, Any] = {
    "display_name": "Alex",
    "date_of_birth": "1995-06-15",
    "gender": "woman",
    "orientation_preferences": ["men"],
    "relationship_intention": "serious",
    "city": "Bengaluru",
    "locality": "Indiranagar",
    "bio": "Hello there",
    "interests": ["hiking", "coffee"],
}


def _onboard(client: TestClient, headers: dict[str, str], **overrides: Any) -> dict[str, Any]:
    payload = {**ONBOARDING_PAYLOAD, **overrides}
    response = client.post("/onboarding/profile", json=payload, headers=headers)
    assert response.status_code == 201
    return response.json()


def test_account_delete_sets_is_active_false_and_deleted_at(
    client: TestClient,
    login: Callable[[], dict[str, Any]],
    db_session_factory: sessionmaker[DbSession],
) -> None:
    tokens = login()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    _onboard(client, headers)

    response = client.post("/auth/account/delete", headers=headers)

    assert response.status_code == 204
    assert response.content == b""

    db = db_session_factory()
    try:
        user = db.get(User, uuid.UUID(tokens["user_id"]))
        assert user is not None
        assert user.is_active is False
        assert user.deleted_at is not None
    finally:
        db.close()


def test_account_delete_scrubs_profile_pii(
    client: TestClient,
    login: Callable[[], dict[str, Any]],
    db_session_factory: sessionmaker[DbSession],
) -> None:
    tokens = login()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    _onboard(client, headers, bio="my real bio", interests=["chess"])

    response = client.post("/auth/account/delete", headers=headers)
    assert response.status_code == 204

    db = db_session_factory()
    try:
        profile = db.scalar(
            select(Profile).where(Profile.user_id == uuid.UUID(tokens["user_id"]))
        )
        assert profile is not None
        assert profile.display_name == DELETED_USER_PLACEHOLDER
        assert profile.bio is None
        assert profile.interests is None
        # Not PII -- must survive deletion for aggregate analytics.
        assert profile.city == ONBOARDING_PAYLOAD["city"]
        assert profile.locality == ONBOARDING_PAYLOAD["locality"]
        assert profile.gender == ONBOARDING_PAYLOAD["gender"]
        assert profile.relationship_intention == ONBOARDING_PAYLOAD["relationship_intention"]
    finally:
        db.close()


def test_account_delete_without_profile_does_not_error(
    client: TestClient, login: Callable[[], dict[str, Any]]
) -> None:
    """A user who deletes before completing onboarding has no `Profile` row
    yet -- this must not be treated as an error."""
    tokens = login()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    response = client.post("/auth/account/delete", headers=headers)

    assert response.status_code == 204


def test_account_delete_rejects_unauthenticated_request(client: TestClient) -> None:
    response = client.post("/auth/account/delete")

    assert response.status_code == 401


def test_deleted_users_token_is_rejected_on_next_request(
    client: TestClient, login: Callable[[], dict[str, Any]]
) -> None:
    tokens = login()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    _onboard(client, headers)

    delete_response = client.post("/auth/account/delete", headers=headers)
    assert delete_response.status_code == 204

    # The same, still-unexpired access token must now be rejected --
    # `get_current_user` already checks `not user.is_active`, so flipping
    # that flag invalidates it with no separate blacklist mechanism.
    me_response = client.get("/profiles/me", headers=headers)
    assert me_response.status_code == 401


def test_deleted_user_disappears_from_discovery_feed(
    client: TestClient,
    login: Callable[[], dict[str, Any]],
    db_session_factory: sessionmaker[DbSession],
) -> None:
    viewer_tokens = login("+15551234567")
    viewer_headers = {"Authorization": f"Bearer {viewer_tokens['access_token']}"}
    _onboard(client, viewer_headers, display_name="Viewer", city="Bengaluru")

    target_tokens = login("+15559876543")
    target_headers = {"Authorization": f"Bearer {target_tokens['access_token']}"}
    _onboard(client, target_headers, display_name="Target", city="Bengaluru")

    delete_response = client.post("/auth/account/delete", headers=target_headers)
    assert delete_response.status_code == 204

    db = db_session_factory()
    try:
        viewer_profile = db.scalar(
            select(Profile).where(Profile.user_id == uuid.UUID(viewer_tokens["user_id"]))
        )
        assert viewer_profile is not None
        feed = discovery_service.get_feed(db, viewer_profile)
        feed_display_names = {profile.display_name for profile in feed}
        assert "Target" not in feed_display_names
    finally:
        db.close()


def test_self_deletion_is_distinguishable_from_admin_suspension(
    client: TestClient,
    login: Callable[[], dict[str, Any]],
    db_session_factory: sessionmaker[DbSession],
) -> None:
    """The plan's single most important fix: a self-deleted account and an
    admin-suspended account both set `is_active = False`, but only
    self-deletion also sets `deleted_at` -- write a test asserting exactly
    that distinction."""
    deleted_tokens = login("+15551234567")
    deleted_headers = {"Authorization": f"Bearer {deleted_tokens['access_token']}"}
    client.post("/auth/account/delete", headers=deleted_headers)

    suspended_tokens = login("+15559876543")

    db = db_session_factory()
    try:
        admin_service.suspend_user(
            db, uuid.UUID(suspended_tokens["user_id"]), admin_user_id=uuid.uuid4()
        )

        deleted_user = db.get(User, uuid.UUID(deleted_tokens["user_id"]))
        suspended_user = db.get(User, uuid.UUID(suspended_tokens["user_id"]))

        assert deleted_user is not None
        assert suspended_user is not None

        assert deleted_user.is_active is False
        assert deleted_user.deleted_at is not None

        assert suspended_user.is_active is False
        assert suspended_user.deleted_at is None
    finally:
        db.close()
