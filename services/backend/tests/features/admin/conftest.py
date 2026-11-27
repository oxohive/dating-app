"""Shared fixtures for admin feature tests.

Same pattern as the other B3 conftests, plus an `as_user(user)` helper that
overrides `auth.dependencies.get_current_user` directly (admin endpoints
gate on `User.is_admin`, not on a `Profile`, so there's no need to go
through `get_current_profile` here).
"""
from __future__ import annotations

import uuid
from collections.abc import Generator
from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session as DbSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from packages.api.core.database import Base, get_db
from packages.api.features.auth.dependencies import get_current_user
from packages.api.features.auth.models import User
from packages.api.features.profiles.models import Profile
from packages.api.features.safety.models import Report  # noqa: F401
from packages.api.features.subscriptions.models import Payment, Subscription  # noqa: F401
from packages.api.features.verification.models import STATUS_PENDING, Verification  # noqa: F401
from packages.api.main import app


class FakeS3Client:
    """Minimal stand-in for the boto3 S3 client's `generate_presigned_url`
    (the review-queue's `GET /admin/verifications` resolves each
    selfie's `s3_key` to a viewable URL via this)."""

    def generate_presigned_url(
        self, _operation_name: str, Params: dict[str, Any], ExpiresIn: int  # noqa: N803
    ) -> str:
        bucket = Params["Bucket"]
        key = Params["Key"]
        return f"https://{bucket}.s3.amazonaws.com/{key}?expires_in={ExpiresIn}"


@pytest.fixture(autouse=True)
def _patch_s3(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        "packages.api.features.verification.selfie_service.get_s3_client",
        lambda: FakeS3Client(),
    )


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
def client(db_session_factory: sessionmaker[DbSession]) -> Generator[TestClient, None, None]:
    def override_get_db() -> Generator[DbSession, None, None]:
        session = db_session_factory()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.fixture
def as_user(client: TestClient):
    """Returns an `as_user(user)` helper overriding the caller's identity."""

    def _as_user(user: User) -> None:
        app.dependency_overrides[get_current_user] = lambda: user

    yield _as_user
    app.dependency_overrides.pop(get_current_user, None)


def make_user(
    db: DbSession,
    *,
    phone_number: str | None = None,
    is_admin: bool = False,
    is_active: bool = True,
) -> User:
    user = User(
        phone_number=phone_number or f"+1555{uuid.uuid4().int % 10_000_000:07d}",
        is_admin=is_admin,
        is_active=is_active,
    )
    db.add(user)
    db.commit()
    return user


def make_user_and_profile(
    db: DbSession,
    *,
    phone_number: str | None = None,
    display_name: str = "Test User",
    is_admin: bool = False,
) -> tuple[User, Profile]:
    user = make_user(db, phone_number=phone_number, is_admin=is_admin)
    profile = Profile(
        user_id=user.id,
        display_name=display_name,
        gender="woman",
        orientation_preferences=["men"],
        relationship_intention="serious",
        city="Mumbai",
        locality="Downtown",
    )
    db.add(profile)
    db.commit()
    return user, profile


def make_verification(
    db: DbSession,
    *,
    profile_id: uuid.UUID,
    status: str = STATUS_PENDING,
    selfie_s3_key: str | None = "verifications/some-profile/selfie.jpg",
) -> Verification:
    verification = Verification(
        profile_id=profile_id,
        status=status,
        selfie_s3_key=selfie_s3_key,
    )
    db.add(verification)
    db.commit()
    return verification


def make_subscription(
    db: DbSession,
    *,
    user_id: uuid.UUID,
    plan: str = "monthly",
    status: str = "active",
    started_at: datetime | None = None,
    expires_at: datetime | None = None,
) -> Subscription:
    now = datetime.now(UTC)
    subscription = Subscription(
        user_id=user_id,
        plan=plan,
        status=status,
        started_at=started_at or now,
        expires_at=expires_at or (now + timedelta(days=30)),
    )
    db.add(subscription)
    db.commit()
    return subscription


def make_payment(
    db: DbSession,
    *,
    user_id: uuid.UUID,
    subscription_id: uuid.UUID | None = None,
    provider: str = "razorpay",
    provider_payment_id: str | None = None,
    amount_minor_units: int = 29_900,
    currency: str = "INR",
    status: str = "succeeded",
) -> Payment:
    payment = Payment(
        user_id=user_id,
        subscription_id=subscription_id,
        provider=provider,
        provider_payment_id=provider_payment_id or f"pay_test_{uuid.uuid4().hex[:10]}",
        amount_minor_units=amount_minor_units,
        currency=currency,
        status=status,
    )
    db.add(payment)
    db.commit()
    return payment
