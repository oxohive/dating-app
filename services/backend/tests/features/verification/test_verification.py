"""Verification feature tests: selfie presign/confirm and self-service status.

Approve/reject review-action tests live in `tests/features/admin/test_admin.py`
(the review queue is an addition to the `admin` feature, not `verification`)
-- this file covers the `verification` router's own endpoints: presign,
confirm, and status, including that confirming does not let the caller set
`status`/`reviewed_by_user_id`/`reviewed_at` directly (those fields aren't
even accepted in the confirm request body).
"""
from __future__ import annotations

from collections.abc import Callable

from fastapi.testclient import TestClient


def test_presign_returns_upload_url_and_s3_key(
    client: TestClient, onboarded_headers: Callable[[], dict[str, str]]
) -> None:
    headers = onboarded_headers()

    response = client.post(
        "/verification/me/selfie/presign",
        json={"content_type": "image/jpeg"},
        headers=headers,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["upload_url"].startswith("https://")
    assert body["s3_key"].startswith("verifications/")
    assert body["s3_key"].endswith(".jpg")


def test_status_before_any_submission_is_null(
    client: TestClient, onboarded_headers: Callable[[], dict[str, str]]
) -> None:
    headers = onboarded_headers()

    response = client.get("/verification/me/status", headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert body["status"] is None
    assert body["reviewed_at"] is None


def test_confirm_creates_pending_verification(
    client: TestClient, onboarded_headers: Callable[[], dict[str, str]]
) -> None:
    headers = onboarded_headers()
    presign = client.post(
        "/verification/me/selfie/presign",
        json={"content_type": "image/png"},
        headers=headers,
    ).json()

    response = client.post(
        "/verification/me/selfie/confirm",
        json={"s3_key": presign["s3_key"]},
        headers=headers,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "pending"
    assert body["reviewed_at"] is None


def test_status_reflects_pending_after_confirm(
    client: TestClient, onboarded_headers: Callable[[], dict[str, str]]
) -> None:
    headers = onboarded_headers()
    presign = client.post(
        "/verification/me/selfie/presign",
        json={"content_type": "image/png"},
        headers=headers,
    ).json()
    client.post(
        "/verification/me/selfie/confirm",
        json={"s3_key": presign["s3_key"]},
        headers=headers,
    )

    response = client.get("/verification/me/status", headers=headers)

    assert response.status_code == 200
    assert response.json()["status"] == "pending"


def test_confirm_request_body_cannot_set_status_or_review_fields(
    client: TestClient, onboarded_headers: Callable[[], dict[str, str]]
) -> None:
    """The confirm endpoint only accepts `s3_key` -- extra fields attempting
    to set `status`/`reviewed_by_user_id`/`reviewed_at` are ignored by
    pydantic (not part of `SelfieConfirmIn`), so the stored verification
    always comes out `pending` with no reviewer, regardless of what the
    caller sends."""
    headers = onboarded_headers()
    presign = client.post(
        "/verification/me/selfie/presign",
        json={"content_type": "image/png"},
        headers=headers,
    ).json()

    response = client.post(
        "/verification/me/selfie/confirm",
        json={
            "s3_key": presign["s3_key"],
            "status": "approved",
            "reviewed_by_user_id": "11111111-1111-1111-1111-111111111111",
            "reviewed_at": "2026-01-01T00:00:00Z",
        },
        headers=headers,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "pending"
    assert body["reviewed_at"] is None


def test_selfie_endpoints_require_authentication(client: TestClient) -> None:
    assert (
        client.post(
            "/verification/me/selfie/presign", json={"content_type": "image/jpeg"}
        ).status_code
        == 401
    )
    assert (
        client.post("/verification/me/selfie/confirm", json={"s3_key": "x"}).status_code == 401
    )
    assert client.get("/verification/me/status").status_code == 401


def test_resubmission_after_rejection_resets_to_pending(
    client: TestClient, onboarded_headers: Callable[[], dict[str, str]]
) -> None:
    """Resubmitting a new selfie always resets the row to `pending` and
    clears any prior review decision, regardless of what it was before."""
    headers = onboarded_headers()
    first_presign = client.post(
        "/verification/me/selfie/presign",
        json={"content_type": "image/png"},
        headers=headers,
    ).json()
    client.post(
        "/verification/me/selfie/confirm",
        json={"s3_key": first_presign["s3_key"]},
        headers=headers,
    )

    second_presign = client.post(
        "/verification/me/selfie/presign",
        json={"content_type": "image/png"},
        headers=headers,
    ).json()
    response = client.post(
        "/verification/me/selfie/confirm",
        json={"s3_key": second_presign["s3_key"]},
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json()["status"] == "pending"
