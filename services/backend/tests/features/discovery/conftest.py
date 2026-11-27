"""Shared fixtures for discovery feature tests.

Provides an isolated in-memory SQLite DB per test (overriding
`core.database.get_db`) plus an `as_profile(profile)` helper that overrides
`auth.dependencies.get_current_profile` directly -- these tests exercise
discovery's own logic, not auth's login flow, so there is no need to mint a
real JWT.

This file is intentionally duplicated (not shared via a package import)
across `tests/features/{discovery,likes,matches}/` -- consistent with the
pattern already used for `tests/features/{auth,onboarding,profiles}/` --
so this subtask's test fixtures never collide with another parallel
subtask's `tests/features/**` conftest.
"""
from __future__ import annotations

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

# Import our own models too, so their tables are registered on
# Base.metadata before create_all runs below.
from packages.api.features.discovery.models import Pass  # noqa: F401
from packages.api.features.likes.models import Like  # noqa: F401

# `location` (UserLocation) and `subscriptions` (Subscription/Payment) are
# other subtasks' tables this feature's GPS-discovery/premium-gating code
# queries (see discovery_service.get_nearby_feed and
# routes.has_active_premium) -- imported here, same reason as every other
# model import in this file, so SQLite's create_all below actually
# creates those tables too.
from packages.api.features.location.models import UserLocation  # noqa: F401
from packages.api.features.matches.models import Match  # noqa: F401
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


def make_user_and_profile(
    db: DbSession,
    *,
    phone_number: str | None = None,
    city: str = "Mumbai",
    display_name: str = "Test User",
    bio: str | None = None,
    interests: list | None = None,
    is_active: bool = True,
) -> Profile:
    """Create and commit a User + Profile pair, returning the Profile."""
    user = User(
        phone_number=phone_number or f"+1555{uuid.uuid4().int % 10_000_000:07d}",
        is_active=is_active,
    )
    db.add(user)
    db.flush()

    profile = Profile(
        user_id=user.id,
        display_name=display_name,
        gender="woman",
        orientation_preferences=["men"],
        relationship_intention="serious",
        bio=bio,
        interests=interests,
        city=city,
        locality="Downtown",
    )
    db.add(profile)
    db.commit()
    return profile


@pytest.fixture
def make_profile(db: DbSession):
    """Returns a `make_profile(**kwargs) -> Profile` factory bound to `db`."""

    def _factory(**kwargs) -> Profile:
        return make_user_and_profile(db, **kwargs)

    return _factory


@pytest.fixture
def make_premium(db: DbSession):
    """Returns a `make_premium(profile)` helper that gives `profile`'s
    owning user an active, unexpired `Subscription` row -- the same
    condition `subscriptions_service.has_active_premium` checks."""
    import datetime as _dt

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


@pytest.fixture
def make_location(db: DbSession):
    """Returns a `make_location(profile, latitude, longitude)` helper that
    writes a `UserLocation` row directly (bypassing the Premium-gated
    route -- these tests exercise discovery's own GPS feed/compatibility
    logic, not the location feature's write path)."""

    def _factory(profile: Profile, latitude: float, longitude: float) -> UserLocation:
        location = UserLocation(
            profile_id=profile.id, latitude=latitude, longitude=longitude
        )
        db.add(location)
        db.commit()
        return location

    return _factory
