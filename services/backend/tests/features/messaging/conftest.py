"""Shared fixtures for messaging feature tests.

Provides an isolated in-memory SQLite DB per test (overriding
`core.database.get_db`) plus an `as_profile(profile)` helper that overrides
`auth.dependencies.get_current_profile` directly -- these tests exercise
messaging's own logic, not auth's login flow, so there is no need to mint a
real JWT.

This file is intentionally duplicated (not shared via a package import)
across `tests/features/{messaging,safety,admin}/` -- consistent with the
pattern already used by the other parallel subtasks' `tests/features/**`
conftests -- so this subtask's test fixtures never collide with another
parallel subtask's.
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

# Import models (ours and the siblings we query/join) so their tables are
# registered on Base.metadata before create_all runs below.
from packages.api.features.matches.models import Match  # noqa: F401
from packages.api.features.messaging.models import Conversation, Message  # noqa: F401
from packages.api.features.profiles.models import Profile
from packages.api.features.safety.models import Block  # noqa: F401
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
    """Returns an `as_profile(profile)` helper overriding the caller's identity."""

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
        city=city,
        locality="Downtown",
    )
    db.add(profile)
    db.commit()
    return profile


def make_match(
    db: DbSession, profile_a: Profile, profile_b: Profile, *, is_active: bool = True
) -> Match:
    """Create a normalized Match row (smaller UUID as profile_a_id) between two profiles."""
    a_id, b_id = sorted([profile_a.id, profile_b.id])
    match = Match(profile_a_id=a_id, profile_b_id=b_id, is_active=is_active)
    db.add(match)
    db.commit()
    return match
