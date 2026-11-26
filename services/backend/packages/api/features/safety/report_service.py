"""Report service: create reports, hand off to admin/moderation review.

`packages.api.features.admin.admin_service` reads `Report` rows created
here directly via `packages.api.features.safety.models.Report` — it does
not go through this module, since it only needs to list/update, not create.
"""
from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from packages.api.features.profiles.models import Profile
from packages.api.features.safety.models import Report


def create_report(
    db: Session,
    reporter_profile_id: uuid.UUID,
    reported_profile_id: uuid.UUID,
    reason: str,
    details: str | None,
) -> Report:
    """Create a report against `reported_profile_id`. Raises 404 if it doesn't exist."""
    if reporter_profile_id == reported_profile_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot report yourself"
        )

    target_exists = db.scalar(select(Profile.id).where(Profile.id == reported_profile_id))
    if target_exists is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    report = Report(
        reporter_profile_id=reporter_profile_id,
        reported_profile_id=reported_profile_id,
        reason=reason,
        details=details,
        status="open",
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report
