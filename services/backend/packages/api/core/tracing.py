"""OpenTelemetry tracing bootstrap (stub, swappable exporter).

Configures a process-wide TracerProvider with a console span exporter so
traces are visible locally during the MVP phase. This is intentionally
thin: swap `_build_exporter()`-equivalent wiring here for an OTLP exporter
pointed at AWS X-Ray / CloudWatch once infra/ provisions a collector.
"""
from __future__ import annotations

from opentelemetry import trace
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import ConsoleSpanExporter, SimpleSpanProcessor

from packages.api.core.config import get_settings

_configured = False


def configure_tracing() -> None:
    """Configure a process-wide TracerProvider exactly once.

    Uses a console exporter today. TODO(infra): swap for an OTLP exporter
    pointed at AWS X-Ray / CloudWatch once that infra is provisioned.
    """
    global _configured
    if _configured:
        return

    settings = get_settings()
    resource = Resource.create({"service.name": settings.otel_service_name})
    provider = TracerProvider(resource=resource)
    provider.add_span_processor(SimpleSpanProcessor(ConsoleSpanExporter()))
    trace.set_tracer_provider(provider)
    _configured = True


def get_tracer(name: str) -> trace.Tracer:
    """Return a tracer for the given instrumentation name."""
    configure_tracing()
    return trace.get_tracer(name)
