"""OTP request/verify, refresh, and logout flow tests."""
from __future__ import annotations

from fastapi.testclient import TestClient


def test_otp_request_returns_202_and_sends_a_code(
    client: TestClient, sent_otps: list[tuple[str, str]]
) -> None:
    response = client.post("/auth/otp/request", json={"phone_number": "+15551234567"})

    assert response.status_code == 202
    assert len(sent_otps) == 1
    phone, code = sent_otps[0]
    assert phone == "+15551234567"
    assert len(code) == 6
    assert code.isdigit()


def test_otp_verify_happy_path_creates_new_user(
    client: TestClient, sent_otps: list[tuple[str, str]]
) -> None:
    phone_number = "+15551234567"
    client.post("/auth/otp/request", json={"phone_number": phone_number})
    _, code = sent_otps[-1]

    response = client.post(
        "/auth/otp/verify", json={"phone_number": phone_number, "code": code}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["is_new_user"] is True
    assert body["access_token"]
    assert body["refresh_token"]
    assert body["user_id"]


def test_otp_verify_existing_user_is_not_new(
    client: TestClient, sent_otps: list[tuple[str, str]]
) -> None:
    phone_number = "+15551234567"

    client.post("/auth/otp/request", json={"phone_number": phone_number})
    _, code = sent_otps[-1]
    first = client.post(
        "/auth/otp/verify", json={"phone_number": phone_number, "code": code}
    ).json()

    client.post("/auth/otp/request", json={"phone_number": phone_number})
    _, code2 = sent_otps[-1]
    second = client.post(
        "/auth/otp/verify", json={"phone_number": phone_number, "code": code2}
    ).json()

    assert second["is_new_user"] is False
    assert second["user_id"] == first["user_id"]


def test_otp_verify_rejects_wrong_code(
    client: TestClient, sent_otps: list[tuple[str, str]]
) -> None:
    phone_number = "+15551234567"
    client.post("/auth/otp/request", json={"phone_number": phone_number})

    response = client.post(
        "/auth/otp/verify", json={"phone_number": phone_number, "code": "000000"}
    )

    assert response.status_code == 401


def test_otp_verify_rejects_code_after_it_was_already_used(
    client: TestClient, sent_otps: list[tuple[str, str]]
) -> None:
    phone_number = "+15551234567"
    client.post("/auth/otp/request", json={"phone_number": phone_number})
    _, code = sent_otps[-1]

    first = client.post(
        "/auth/otp/verify", json={"phone_number": phone_number, "code": code}
    )
    second = client.post(
        "/auth/otp/verify", json={"phone_number": phone_number, "code": code}
    )

    assert first.status_code == 200
    assert second.status_code == 401


def test_otp_verify_rejects_code_with_no_prior_request(client: TestClient) -> None:
    response = client.post(
        "/auth/otp/verify", json={"phone_number": "+15559999999", "code": "123456"}
    )

    assert response.status_code == 401


def test_refresh_rotates_tokens(client: TestClient, sent_otps: list[tuple[str, str]]) -> None:
    phone_number = "+15551234567"
    client.post("/auth/otp/request", json={"phone_number": phone_number})
    _, code = sent_otps[-1]
    verify_body = client.post(
        "/auth/otp/verify", json={"phone_number": phone_number, "code": code}
    ).json()

    response = client.post(
        "/auth/refresh", json={"refresh_token": verify_body["refresh_token"]}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["access_token"]
    assert body["refresh_token"]
    assert body["refresh_token"] != verify_body["refresh_token"]


def test_refresh_rejects_already_rotated_token(
    client: TestClient, sent_otps: list[tuple[str, str]]
) -> None:
    phone_number = "+15551234567"
    client.post("/auth/otp/request", json={"phone_number": phone_number})
    _, code = sent_otps[-1]
    verify_body = client.post(
        "/auth/otp/verify", json={"phone_number": phone_number, "code": code}
    ).json()

    client.post("/auth/refresh", json={"refresh_token": verify_body["refresh_token"]})
    reuse_response = client.post(
        "/auth/refresh", json={"refresh_token": verify_body["refresh_token"]}
    )

    assert reuse_response.status_code == 401


def test_logout_revokes_refresh_token(
    client: TestClient, sent_otps: list[tuple[str, str]]
) -> None:
    phone_number = "+15551234567"
    client.post("/auth/otp/request", json={"phone_number": phone_number})
    _, code = sent_otps[-1]
    verify_body = client.post(
        "/auth/otp/verify", json={"phone_number": phone_number, "code": code}
    ).json()

    logout_response = client.post(
        "/auth/logout", json={"refresh_token": verify_body["refresh_token"]}
    )
    refresh_after_logout = client.post(
        "/auth/refresh", json={"refresh_token": verify_body["refresh_token"]}
    )

    assert logout_response.status_code == 204
    assert refresh_after_logout.status_code == 401


def test_protected_endpoint_rejects_missing_token(client: TestClient) -> None:
    response = client.get("/profiles/me")

    assert response.status_code == 401


def test_protected_endpoint_rejects_garbage_token(client: TestClient) -> None:
    response = client.get(
        "/profiles/me", headers={"Authorization": "Bearer not-a-real-token"}
    )

    assert response.status_code == 401
