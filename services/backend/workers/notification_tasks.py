"""Celery tasks for dispatching push notifications.

TODO: implement in a future tasks/ ticket (see tasks/ directory). Should
call into packages.api.features.notifications.notification_service once
push delivery is implemented.
"""
from __future__ import annotations

from typing import Any

from workers.celery_app import celery_app


@celery_app.task(name="workers.notification_tasks.send_push_notification")
def send_push_notification(user_id: str, payload: dict[str, Any]) -> None:
    """Placeholder task. TODO: implement push notification delivery."""
    raise NotImplementedError("send_push_notification is not implemented yet")
