"""Shared fixtures for location feature tests.

Same pattern as `tests/features/discovery/conftest.py`: an isolated
in-memory SQLite DB per test (overriding `core.database.get_db`) plus an
`as_profile(profile)` helper overriding `auth.dependencies.get_current_profile`
directly. Intentionally duplicated rather than shared via a package
import, per this repo's existing convention (see that file's own
docstring) -- keeps this subtask's fixtures from colliding with any
other parallel subtask's `tests/features/**` conftest.
"""
from __future__ import annotations

import datetime as _dt
import uuid
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session as DbSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from packages.api.core.database import Base, get_db
from packages.api.features.auth.dependencies import get_current_profile
from packages.api.features.auth.models import User
from packages.api.features.location.models import UserLocation  # noqa: F401
from packages.api.features.profiles.models import Profile
from packages.api.features.subscriptions.models import Payment, Subscription  # noqa: F401
from packages.api.main import app


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
def as_profile(client: TestClient):
    """Returns a `as_profile(profile)` helper overriding the caller's identity."""

    def _as_profile(profile: Profile) -> None:
        app.dependency_overrides[get_current_profile] = lambda: profile

    yield _as_profile
    app.dependency_overrides.pop(get_current_profile, None)


def make_user_and_profile(db: DbSession, *, city: str = "Mumbai") -> Profile:
    user = User(phone_number=f"+1555{uuid.uuid4().int % 10_000_000:07d}", is_active=True)
    db.add(user)
    db.flush()

    profile = Profile(
        user_id=user.id,
        display_name="Test User",
        gender="woman",
        orientation_preferences=["men"],
        relationship_intention="serious",
        city=city,
        locality="Downtown",
    )
    db.add(profile)
    db.commit()
    return profile


@pytest.fixture
def make_profile(db: DbSession):
    def _factory(**kwargs) -> Profile:
        return make_user_and_profile(db, **kwargs)

    return _factory


@pytest.fixture
def make_premium(db: DbSession):
    """Returns a `make_premium(profile)` helper that gives `profile`'s
    owning user an active, unexpired `Subscription` row."""

    def _factory(profile: Profile) -> Subscription:
        subscription = Subscription(
            user_id=profile.user_id,
            plan="monthly",
            status="active",
            started_at=_dt.datetime.now(_dt.UTC),
            expires_at=_dt.datetime.now(_dt.UTC) + _dt.timedelta(days=30),
        )
        db.add(subscription)
        db.commit()
        return subscription

    return _factory
