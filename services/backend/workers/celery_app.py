"""Celery application setup.

Configures Celery with a Redis broker/result backend sourced from
`packages.api.core.config`, and defines a base task class that restores
the correlation ID contextvar from task message headers so correlation IDs
propagate from the HTTP request that enqueued a task into the worker
process that executes it (and therefore into that task's structured logs
too, via packages.api.core.logging).

Producers should enqueue with the current correlation ID attached, e.g.:

    from packages.api.core.correlation_id import get_correlation_id
    some_task.apply_async(args=[...], headers={"correlation_id": get_correlation_id()})
"""
from __future__ import annotations

from typing import Any

from celery import Celery, Task

from packages.api.core.config import get_settings
from packages.api.core.correlation_id import correlation_id_var

settings = get_settings()


class CorrelationIdTask(Task):
    """Base task that restores the correlation ID from message headers."""

    def __call__(self, *args: Any, **kwargs: Any) -> Any:
        headers = self.request.headers or {}
        correlation_id = headers.get("correlation_id", "-")
        token = correlation_id_var.set(correlation_id)
        try:
            return super().__call__(*args, **kwargs)
        finally:
            correlation_id_var.reset(token)


celery_app = Celery(
    "dating_app",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    task_cls="workers.celery_app.CorrelationIdTask",
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

celery_app.autodiscover_tasks(
    [
        "workers.likes_quota_reset",
        "workers.notification_tasks",
        "workers.media_processing",
    ]
)
