"""Correlation ID propagation.

A Starlette middleware reads the incoming correlation ID header (or
generates a new uuid4 per request), stores it in a contextvar so it can be
picked up by the structured logging filter (core/logging.py) and by Celery
task producers (workers/celery_app.py), and echoes it back on the response.
"""
from __future__ import annotations

import contextvars
import uuid

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from packages.api.core.config import get_settings

correlation_id_var: contextvars.ContextVar[str] = contextvars.ContextVar(
    "correlation_id", default="-"
)


def get_correlation_id() -> str:
    """Return the correlation ID for the current context, or "-" if unset."""
    return correlation_id_var.get()


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """Attach a correlation ID to every request/response pair."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        header_name = get_settings().correlation_id_header
        correlation_id = request.headers.get(header_name) or str(uuid.uuid4())
        token = correlation_id_var.set(correlation_id)
        try:
            response = await call_next(request)
        finally:
            correlation_id_var.reset(token)
        response.headers[header_name] = correlation_id
        return response
