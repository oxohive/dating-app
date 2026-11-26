"""Periodic task: reset daily/weekly like quotas.

TODO: implement in a future tasks/ ticket (see tasks/ directory). Should
reset the counters consumed by
packages.api.features.likes.quota_service on a schedule driven by Celery
beat.
"""
from __future__ import annotations

from workers.celery_app import celery_app


@celery_app.task(name="workers.likes_quota_reset.reset_like_quotas")
def reset_like_quotas() -> None:
    """Placeholder periodic task. TODO: implement quota reset logic."""
    raise NotImplementedError("reset_like_quotas is not implemented yet")
