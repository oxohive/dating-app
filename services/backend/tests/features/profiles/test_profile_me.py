"""`/profiles/me` GET/PATCH tests."""
from __future__ import annotations

from collections.abc import Callable
from typing import Any

from fastapi.testclient import TestClient

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


def _onboard(client: TestClient, login: Callable[[], dict[str, Any]]) -> dict[str, str]:
    tokens = login()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    client.post("/onboarding/profile", json=ONBOARDING_PAYLOAD, headers=headers)
    return headers


def test_get_my_profile_returns_full_profile(
    client: TestClient, login: Callable[[], dict[str, Any]]
) -> None:
    headers = _onboard(client, login)

    response = client.get("/profiles/me", headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert body["display_name"] == "Alex"
    assert body["city"] == "Bengaluru"


def test_get_my_profile_without_onboarding_is_404(
    client: TestClient, login: Callable[[], dict[str, Any]]
) -> None:
    tokens = login()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    response = client.get("/profiles/me", headers=headers)

    assert response.status_code == 404


def test_patch_my_profile_applies_partial_update(
    client: TestClient, login: Callable[[], dict[str, Any]]
) -> None:
    headers = _onboard(client, login)

    response = client.patch(
        "/profiles/me", json={"bio": "Updated bio"}, headers=headers
    )

    assert response.status_code == 200
    body = response.json()
    assert body["bio"] == "Updated bio"
    # Untouched fields are preserved.
    assert body["display_name"] == "Alex"
    assert body["city"] == "Bengaluru"


def test_patch_my_profile_rejects_bio_too_long(
    client: TestClient, login: Callable[[], dict[str, Any]]
) -> None:
    headers = _onboard(client, login)

    response = client.patch(
        "/profiles/me", json={"bio": "x" * 501}, headers=headers
    )

    assert response.status_code == 422
