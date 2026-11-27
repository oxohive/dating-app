"""FastAPI application entrypoint.

Wires together structured logging, correlation ID propagation, tracing,
and every feature router that exposes HTTP endpoints. Run locally with:

    uvicorn packages.api.main:app --reload
"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
from packages.api.features.notifications.routes import router as notifications_router
from packages.api.features.onboarding.routes import router as onboarding_router
from packages.api.features.profiles.routes import router as profiles_router
from packages.api.features.safety.routes import router as safety_router
from packages.api.features.subscriptions.routes import router as subscriptions_router
from packages.api.features.verification.routes import router as verification_router

configure_logging()
configure_tracing()

settings = get_settings()

app = FastAPI(title=settings.app_name)

app.add_middleware(CorrelationIdMiddleware)

# CORS: browser-based clients (admin-web, marketing-site) live on different
# origins from the backend's own domain, and FastAPI allows no cross-origin
# requests by default. This was never caught by earlier testing: /docs is
# same-origin, and native mobile clients don't enforce CORS at all — it only
# surfaced once admin-web started calling the backend over a real domain
# instead of being blocked earlier by mixed-content (plain HTTP from an
# HTTPS page). Covers the two production custom domains plus any Vercel
# preview deployment (dynamic *.vercel.app subdomains) and local dev.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://([a-zA-Z0-9-]+\.)*oxohive\.com|https://[a-zA-Z0-9-]+\.vercel\.app|http://localhost(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
app.include_router(subscriptions_router, prefix="/subscriptions", tags=["subscriptions"])
app.include_router(verification_router, prefix="/verification", tags=["verification"])
app.include_router(notifications_router, prefix="/notifications", tags=["notifications"])
app.include_router(admin_router, prefix="/admin", tags=["admin"])
