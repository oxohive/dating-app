"""Onboarding profile-creation tests: happy path + duplicate-attempt rejection."""
from __future__ import annotations

from collections.abc import Callable
from typing import Any

from fastapi.testclient import TestClient

VALID_PAYLOAD: dict[str, Any] = {
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


def test_onboarding_creates_profile(
    client: TestClient, login: Callable[[], dict[str, Any]]
) -> None:
    tokens = login()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    response = client.post("/onboarding/profile", json=VALID_PAYLOAD, headers=headers)

    assert response.status_code == 201
    body = response.json()
    assert body["display_name"] == "Alex"
    assert body["city"] == "Bengaluru"
    assert body["user_id"] == tokens["user_id"]


def test_onboarding_rejects_duplicate_attempt(
    client: TestClient, login: Callable[[], dict[str, Any]]
) -> None:
    tokens = login()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    first = client.post("/onboarding/profile", json=VALID_PAYLOAD, headers=headers)
    second = client.post("/onboarding/profile", json=VALID_PAYLOAD, headers=headers)

    assert first.status_code == 201
    assert second.status_code == 409


def test_onboarding_rejects_underage_date_of_birth(
    client: TestClient, login: Callable[[], dict[str, Any]]
) -> None:
    tokens = login()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    payload = {**VALID_PAYLOAD, "date_of_birth": "2015-01-01"}

    response = client.post("/onboarding/profile", json=payload, headers=headers)

    assert response.status_code == 422


def test_onboarding_requires_authentication(client: TestClient) -> None:
    response = client.post("/onboarding/profile", json=VALID_PAYLOAD)

    assert response.status_code == 401
