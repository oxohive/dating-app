"""Shared fixtures for admin feature tests.

Same pattern as the other B3 conftests, plus an `as_user(user)` helper that
overrides `auth.dependencies.get_current_user` directly (admin endpoints
gate on `User.is_admin`, not on a `Profile`, so there's no need to go
through `get_current_profile` here).
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
from packages.api.features.auth.dependencies import get_current_user
from packages.api.features.auth.models import User
from packages.api.features.profiles.models import Profile
from packages.api.features.safety.models import Report  # noqa: F401
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
