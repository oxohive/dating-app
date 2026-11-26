"""Photo presign/confirm endpoint tests (S3 client is faked, see conftest)."""
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
}


def _onboard(client: TestClient, login: Callable[[], dict[str, Any]]) -> dict[str, str]:
    tokens = login()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    client.post("/onboarding/profile", json=ONBOARDING_PAYLOAD, headers=headers)
    return headers


def test_presign_returns_upload_url_and_s3_key(
    client: TestClient, login: Callable[[], dict[str, Any]]
) -> None:
    headers = _onboard(client, login)

    response = client.post(
        "/profiles/me/photos/presign",
        json={"content_type": "image/jpeg"},
        headers=headers,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["upload_url"].startswith("https://")
    assert body["s3_key"].endswith(".jpg")


def test_confirm_records_photo_and_first_one_is_primary(
    client: TestClient, login: Callable[[], dict[str, Any]]
) -> None:
    headers = _onboard(client, login)
    presign = client.post(
        "/profiles/me/photos/presign",
        json={"content_type": "image/png"},
        headers=headers,
    ).json()

    response = client.post(
        "/profiles/me/photos/confirm",
        json={"s3_key": presign["s3_key"], "position": 0},
        headers=headers,
    )

    assert response.status_code == 201
    body = response.json()
    assert body["s3_key"] == presign["s3_key"]
    assert body["is_primary"] is True


def test_confirm_second_photo_is_not_primary(
    client: TestClient, login: Callable[[], dict[str, Any]]
) -> None:
    headers = _onboard(client, login)

    first_presign = client.post(
        "/profiles/me/photos/presign",
        json={"content_type": "image/png"},
        headers=headers,
    ).json()
    client.post(
        "/profiles/me/photos/confirm",
        json={"s3_key": first_presign["s3_key"], "position": 0},
        headers=headers,
    )

    second_presign = client.post(
        "/profiles/me/photos/presign",
        json={"content_type": "image/png"},
        headers=headers,
    ).json()
    second_confirm = client.post(
        "/profiles/me/photos/confirm",
        json={"s3_key": second_presign["s3_key"], "position": 1},
        headers=headers,
    )

    assert second_confirm.status_code == 201
    assert second_confirm.json()["is_primary"] is False


def test_photos_endpoints_require_authentication(client: TestClient) -> None:
    response = client.post(
        "/profiles/me/photos/presign", json={"content_type": "image/jpeg"}
    )

    assert response.status_code == 401


def test_confirm_photo_response_includes_resolved_url(
    client: TestClient, login: Callable[[], dict[str, Any]]
) -> None:
    """Integration-step reconciliation: every photo response exposes a
    resolved `url` (not just the bare `s3_key`) -- see
    `profiles.photo_service.build_photo_url`, used consistently by every
    endpoint that returns photos."""
    headers = _onboard(client, login)
    presign = client.post(
        "/profiles/me/photos/presign",
        json={"content_type": "image/png"},
        headers=headers,
    ).json()

    response = client.post(
        "/profiles/me/photos/confirm",
        json={"s3_key": presign["s3_key"], "position": 0},
        headers=headers,
    )

    assert response.status_code == 201
    body = response.json()
    assert body["url"].startswith("https://")
    assert presign["s3_key"] in body["url"]

    me_response = client.get("/profiles/me", headers=headers)
    assert me_response.json()["photos"][0]["url"] == body["url"]
