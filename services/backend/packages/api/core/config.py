"""Application configuration loaded from environment variables.

Values are sourced via pydantic-settings from the process environment and
an optional `.env` file. See `.env.example` for the full list of variables
a deployment must provide. No secrets are hardcoded here.
"""
from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Process-wide settings, sourced from env vars / .env."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "dating-app-backend"
    environment: str = "local"
    debug: bool = False

    database_url: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/dating_app"
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/1"

    correlation_id_header: str = "X-Correlation-ID"

    otel_service_name: str = "dating-app-backend"
    # Swappable: "console" today; "xray" / "cloudwatch" once infra/ wires a
    # real OTLP collector. See core/tracing.py.
    otel_exporter: str = "console"

    jwt_secret_key: str = "changeme-local-only"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    fcm_server_key: str = ""


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance for the process lifetime."""
    return Settings()
