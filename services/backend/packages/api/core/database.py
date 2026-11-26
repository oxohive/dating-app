"""SQLAlchemy engine/session setup (synchronous).

A synchronous engine/session is used for simplicity and consistency across
the codebase. Engine creation is lazy and cached so importing this module
never opens a connection and never requires a DB driver to be installed —
only actually calling `get_db()` / `get_engine()` does. This keeps the app
import-clean and testable without a running PostgreSQL instance.
"""
from __future__ import annotations

from collections.abc import Generator
from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from packages.api.core.config import get_settings


class Base(DeclarativeBase):
    """Declarative base class for all ORM models."""


@lru_cache
def get_engine() -> Engine:
    """Return a process-wide cached SQLAlchemy engine."""
    settings = get_settings()
    return create_engine(settings.database_url, pool_pre_ping=True, future=True)


@lru_cache
def get_session_factory() -> sessionmaker[Session]:
    """Return a process-wide cached session factory bound to the engine."""
    return sessionmaker(bind=get_engine(), autoflush=False, autocommit=False, future=True)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a request-scoped DB session."""
    session_factory = get_session_factory()
    db = session_factory()
    try:
        yield db
    finally:
        db.close()
