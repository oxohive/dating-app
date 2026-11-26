"""Safety feature routes.

Mounted with no extra prefix by `packages.api.main`, so the live paths are
the bare `/blocks` / `/reports` named in the plan's endpoint contract
(integration-step fix: this router used to be mounted at `/safety`, which
B3's mobile-facing paths never expected -- see
tasks/0008-mvp-feature-completion's "Known gaps to reconcile" #5).
"""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from packages.api.core.database import get_db
from packages.api.features.auth.dependencies import get_current_profile
from packages.api.features.profiles.models import Profile
from packages.api.features.safety import block_service, report_service
from packages.api.features.safety.schemas import BlockCreate, ReportCreate, ReportOut

router = APIRouter()

DbSession = Annotated[Session, Depends(get_db)]
CurrentProfile = Annotated[Profile, Depends(get_current_profile)]


@router.post("/blocks", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def create_block(
    body: BlockCreate,
    db: DbSession,
    current_profile: CurrentProfile,
) -> None:
    """Block another profile. Idempotent: calling it again is a no-op 204."""
    block_service.create_block(db, current_profile.id, body.profile_id)


@router.post("/reports", response_model=ReportOut, status_code=status.HTTP_201_CREATED)
def create_report(
    body: ReportCreate,
    db: DbSession,
    current_profile: CurrentProfile,
) -> ReportOut:
    """File a safety report against another profile."""
    report = report_service.create_report(
        db,
        reporter_profile_id=current_profile.id,
        reported_profile_id=body.profile_id,
        reason=body.reason,
        details=body.details,
    )
    return ReportOut.model_validate(report)
