"""Shared fixtures for subscriptions feature tests.

Provides an isolated in-memory SQLite DB per test (overriding
`core.database.get_db`) plus an `as_user(user)` helper that overrides
`auth.dependencies.get_current_user` directly -- subscriptions endpoints
gate on `User`, not `Profile` (per `features/auth/dependencies.py`), so
there's no need to go through `get_current_profile` here.

Deviation, matching the existing precedent in
`tests/features/{auth,onboarding,profiles}/conftest.py`: rather than
importing `packages.api.main:app` (which does not yet mount this
subtask's router -- wiring it in is integration-step-only, after all five
Wave-2 subtasks land), this builds a standalone test app that mounts only
the subscriptions router, with the same `/subscriptions` prefix the
integration step is expected to use (consistent with every other
feature's `/feature-name` prefix in `main.py`).

This file is intentionally duplicated (not shared via a package import)
rather than reusing another feature directory's conftest, consistent
with the established repo convention that each `tests/features/**`
directory's conftest is self-contained so parallel subtasks' test
fixtures never collide.
"""
from __future__ import annotations

import uuid
from collections.abc import Generator

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session as DbSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from packages.api.core.database import Base, get_db
from packages.api.features.auth.dependencies import get_current_user
from packages.api.features.auth.models import User

# Import our own models too, so their tables are registered on
# Base.metadata before create_all runs below.
from packages.api.features.subscriptions.models import Payment, Subscription  # noqa: F401
from packages.api.features.subscriptions.routes import router as subscriptions_router


def _build_test_app() -> FastAPI:
    test_app = FastAPI(title="dating-app-backend-test")
    test_app.include_router(subscriptions_router, prefix="/subscriptions", tags=["subscriptions"])
    return test_app


app = _build_test_app()


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
    is_active: bool = True,
) -> User:
    user = User(
        phone_number=phone_number or f"+1555{uuid.uuid4().int % 10_000_000:07d}",
        is_active=is_active,
    )
    db.add(user)
    db.commit()
    return user


@pytest.fixture
def make_test_user(db: DbSession):
    """Returns a `make_test_user(**kwargs) -> User` factory bound to `db`."""

    def _factory(**kwargs) -> User:
        return make_user(db, **kwargs)

    return _factory
