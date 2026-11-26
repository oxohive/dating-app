"""Alembic environment configuration.

Wires Alembic's migration machinery to
`packages.api.core.database.Base` and sources the DB URL from
`packages.api.core.config.get_settings()` instead of hardcoding it in
alembic.ini, so a single source of truth (env vars / .env) drives both the
app and migrations.
"""
from __future__ import annotations

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from packages.api.core.config import get_settings
from packages.api.core.database import Base

# Import every feature's model modules here so they register their tables
# on Base.metadata before autogenerate runs. `onboarding` and `location`
# intentionally define no ORM classes this wave (see their own models.py
# docstrings) so they're omitted below -- there is nothing to import.
from packages.api.features.auth import models as auth_models  # noqa: E402,F401
from packages.api.features.discovery import models as discovery_models  # noqa: E402,F401
from packages.api.features.likes import models as likes_models  # noqa: E402,F401
from packages.api.features.matches import models as matches_models  # noqa: E402,F401
from packages.api.features.messaging import models as messaging_models  # noqa: E402,F401
from packages.api.features.profiles import models as profiles_models  # noqa: E402,F401
from packages.api.features.safety import models as safety_models  # noqa: E402,F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

config.set_main_option("sqlalchemy.url", get_settings().database_url)


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (emits SQL, no DB connection)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode (requires a live DB connection)."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
