"""Shared fixtures for verification feature tests.

Same pattern as `tests/features/profiles/conftest.py`: a standalone test app
mounting only the routers this subtask's tests need (auth + onboarding, to
log in and create a `Profile` to verify; profiles, not strictly required by
these tests but harmless and consistent; verification, the feature under
test) rather than importing `packages.api.main:app`, since this subtask's
own `verification` router is deliberately NOT mounted there yet (wiring a
new feature's prefix into `main.py` is this wave's integration step, same
convention as every prior wave -- see
`tasks/0010-wave2-deferred-features/plan.md`). This keeps this suite
independent of main.py and of the other parallel subtasks' in-flight code.
"""
from __future__ import annotations

import sys
from collections.abc import Generator
from typing import Any

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session as DbSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from packages.api.core.correlation_id import CorrelationIdMiddleware
from packages.api.core.database import Base, get_db

# Import models so their tables are registered on Base.metadata before
# create_all runs below.
from packages.api.features.auth.models import Session as SessionModel  # noqa: F401
from packages.api.features.auth.models import User  # noqa: F401
from packages.api.features.auth.routes import router as auth_router
from packages.api.features.onboarding.routes import router as onboarding_router
from packages.api.features.profiles.models import Profile, ProfilePhoto  # noqa: F401
from packages.api.features.profiles.routes import router as profiles_router
from packages.api.features.verification.models import Verification  # noqa: F401
from packages.api.features.verification.routes import router as verification_router


def _build_test_app() -> FastAPI:
    test_app = FastAPI(title="dating-app-backend-test")
    test_app.add_middleware(CorrelationIdMiddleware)
    test_app.include_router(auth_router, prefix="/auth", tags=["auth"])
    test_app.include_router(onboarding_router, prefix="/onboarding", tags=["onboarding"])
    test_app.include_router(profiles_router, prefix="/profiles", tags=["profiles"])
    test_app.include_router(verification_router, prefix="/verification", tags=["verification"])
    return test_app


app = _build_test_app()


class FakeRedis:
    """Minimal in-memory stand-in for the `redis.Redis` subset otp_service uses."""

    def __init__(self) -> None:
        self._store: dict[str, str] = {}

    def setex(self, key: str, _ttl: int, value: str) -> None:
        self._store[key] = value

    def get(self, key: str) -> str | None:
        return self._store.get(key)

    def delete(self, key: str) -> None:
        self._store.pop(key, None)


class FakeS3Client:
    """Minimal stand-in for the boto3 S3 client's `generate_presigned_url`."""

    def generate_presigned_url(
        self, _operation_name: str, Params: dict[str, Any], ExpiresIn: int  # noqa: N803
    ) -> str:
        bucket = Params["Bucket"]
        key = Params["Key"]
        return f"https://{bucket}.s3.amazonaws.com/{key}?expires_in={ExpiresIn}"


@pytest.fixture
def db_engine() -> Generator[Engine, None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    try:
        yield engine
    finally:
        Base.metadata.drop_all(engine)
        engine.dispose()


@pytest.fixture
def db_session_factory(db_engine: Engine) -> sessionmaker[DbSession]:
    return sessionmaker(bind=db_engine, autoflush=False, autocommit=False)


@pytest.fixture
def db(db_session_factory: sessionmaker[DbSession]) -> Generator[DbSession, None, None]:
    session = db_session_factory()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def sent_otps() -> list[tuple[str, str]]:
    """Captures (phone_number, code) pairs passed to the OTP-SMS stub."""
    return []


@pytest.fixture(autouse=True)
def _patch_external_services(
    monkeypatch: pytest.MonkeyPatch, sent_otps: list[tuple[str, str]]
) -> None:
    fake_redis = FakeRedis()
    monkeypatch.setattr(
        "packages.api.features.auth.otp_service.get_redis_client", lambda: fake_redis
    )
    monkeypatch.setattr(
        "packages.api.features.profiles.photo_service.get_s3_client", lambda: FakeS3Client()
    )
    monkeypatch.setattr(
        "packages.api.features.verification.selfie_service.get_s3_client",
        lambda: FakeS3Client(),
    )

    original_send_otp_sms = sys.modules[
        "packages.api.features.auth.otp_service"
    ].send_otp_sms

    def _capturing_send_otp_sms(phone_number: str, code: str) -> None:
        sent_otps.append((phone_number, code))
        original_send_otp_sms(phone_number, code)

    monkeypatch.setattr(
        "packages.api.features.auth.otp_service.send_otp_sms", _capturing_send_otp_sms
    )


@pytest.fixture
def client(db_session_factory: sessionmaker[DbSession]) -> Generator[TestClient, None, None]:
    def override_get_db() -> Generator[DbSession, None, None]:
        db = db_session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.fixture
def login(client: TestClient, sent_otps: list[tuple[str, str]]):
    """Returns a `login(phone_number) -> dict` helper that drives the real
    OTP request/verify endpoints and returns the verify response body
    (access_token, refresh_token, user_id, is_new_user)."""

    def _login(phone_number: str = "+15551234567") -> dict[str, Any]:
        request_resp = client.post("/auth/otp/request", json={"phone_number": phone_number})
        assert request_resp.status_code == 202
        code = next(c for p, c in reversed(sent_otps) if p == phone_number)
        verify_resp = client.post(
            "/auth/otp/verify", json={"phone_number": phone_number, "code": code}
        )
        assert verify_resp.status_code == 200
        return verify_resp.json()

    return _login


ONBOARDING_PAYLOAD: dict[str, Any] = {
    "display_name": "Alex",
    "date_of_birth": "1995-06-15",
    "gender": "woman",
    "orientation_preferences": ["men"],
    "relationship_intention": "serious",
    "city": "Bengaluru",
    "locality": "Indiranagar",
}


@pytest.fixture
def onboarded_headers(client: TestClient, login):
    """Returns an `(headers) -> dict` style fixture: logs in + onboards a
    fresh profile, returning the `Authorization` header for it."""

    def _onboard(phone_number: str = "+15551234567") -> dict[str, str]:
        tokens = login(phone_number)
        headers = {"Authorization": f"Bearer {tokens['access_token']}"}
        response = client.post("/onboarding/profile", json=ONBOARDING_PAYLOAD, headers=headers)
        assert response.status_code in (200, 201)
        return headers

    return _onboard
