"""Shared fixtures for safety feature tests.

Same pattern as `tests/features/messaging/conftest.py` -- an isolated
in-memory SQLite DB per test (overriding `core.database.get_db`) plus an
`as_profile(profile)` helper overriding `auth.dependencies.get_current_profile`
directly. Intentionally duplicated rather than shared via import, so this
subtask's fixtures never collide with another parallel subtask's.
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
from packages.api.features.profiles.models import Profile
from packages.api.features.safety.models import Block, Report  # noqa: F401
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
) -> Profile:
    """Create and commit a User + Profile pair, returning the Profile."""
    user = User(phone_number=phone_number or f"+1555{uuid.uuid4().int % 10_000_000:07d}")
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
