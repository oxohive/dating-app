"""`GET /profiles/{profile_id}` public-view tests: sensitive fields excluded."""
from __future__ import annotations

import uuid
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


def test_public_profile_excludes_sensitive_fields_and_exposes_age(
    client: TestClient, login: Callable[[], dict[str, Any]]
) -> None:
    tokens = login("+15551234567")
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    onboard_resp = client.post(
        "/onboarding/profile", json=ONBOARDING_PAYLOAD, headers=headers
    )
    profile_id = onboard_resp.json()["id"]

    response = client.get(f"/profiles/{profile_id}")

    assert response.status_code == 200
    body = response.json()

    assert "phone_number" not in body
    assert "email" not in body
    assert "date_of_birth" not in body
    assert "user_id" not in body

    assert body["display_name"] == "Alex"
    assert isinstance(body["age"], int)
    assert body["age"] > 0


def test_public_profile_404s_for_unknown_profile(client: TestClient) -> None:
    response = client.get(f"/profiles/{uuid.uuid4()}")

    assert response.status_code == 404
