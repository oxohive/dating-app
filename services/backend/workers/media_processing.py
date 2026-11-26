"""Celery tasks for profile photo/media processing (resize, moderation scan).

TODO: implement in a future tasks/ ticket (see tasks/ directory). Should
call into packages.api.features.profiles.photo_service once media
processing is implemented.
"""
from __future__ import annotations

from workers.celery_app import celery_app


@celery_app.task(name="workers.media_processing.process_profile_photo")
def process_profile_photo(photo_id: str) -> None:
    """Placeholder task. TODO: implement photo resize/moderation pipeline."""
    raise NotImplementedError("process_profile_photo is not implemented yet")
