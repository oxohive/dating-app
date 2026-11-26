"""FastAPI application entrypoint.

Wires together structured logging, correlation ID propagation, tracing,
and every feature router that exposes HTTP endpoints. Run locally with:

    uvicorn packages.api.main:app --reload
"""
from __future__ import annotations

from fastapi import FastAPI

from packages.api.core.config import get_settings
from packages.api.core.correlation_id import CorrelationIdMiddleware
from packages.api.core.logging import configure_logging
from packages.api.core.tracing import configure_tracing
from packages.api.features.admin.routes import router as admin_router
from packages.api.features.auth.routes import router as auth_router
from packages.api.features.discovery.routes import router as discovery_router
from packages.api.features.health.routes import router as health_router
from packages.api.features.likes.routes import router as likes_router
from packages.api.features.location.routes import router as location_router
from packages.api.features.matches.routes import router as matches_router
from packages.api.features.messaging.routes import router as messaging_router
from packages.api.features.onboarding.routes import router as onboarding_router
from packages.api.features.profiles.routes import router as profiles_router
from packages.api.features.safety.routes import router as safety_router

configure_logging()
configure_tracing()

settings = get_settings()

app = FastAPI(title=settings.app_name)

app.add_middleware(CorrelationIdMiddleware)

# Health is mounted bare (no prefix) at /health; every other feature is
# mounted under its own prefix.
app.include_router(health_router)
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(onboarding_router, prefix="/onboarding", tags=["onboarding"])
app.include_router(profiles_router, prefix="/profiles", tags=["profiles"])
app.include_router(location_router, prefix="/location", tags=["location"])
app.include_router(discovery_router, prefix="/discovery", tags=["discovery"])
app.include_router(likes_router, prefix="/likes", tags=["likes"])
app.include_router(matches_router, prefix="/matches", tags=["matches"])
app.include_router(messaging_router, prefix="", tags=["messaging"])
app.include_router(safety_router, prefix="", tags=["safety"])
app.include_router(admin_router, prefix="/admin", tags=["admin"])

# NOTE: features/notifications has no routes.py by design (per spec) — it is
# a backend-only concern driven by workers/notification_tasks.py, not a
# directly user-facing HTTP surface, so there is nothing to mount here.
