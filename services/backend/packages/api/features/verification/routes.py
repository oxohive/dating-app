"""Verification feature routes: selfie presign/confirm, self-service status.

Not mounted in `packages.api.main` by this subtask (`main.py` is outside
this subtask's ownership, same as every prior wave's convention -- see
`tasks/0010-wave2-deferred-features/plan.md` validator finding #5 and
`ownership.md`'s notes on integration-step-only files); wiring this
router's prefix (`/verification`) into `main.py` is an integration step.

Not Premium-gated -- see `models.py`'s module docstring.
"""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DbSession

from packages.api.core.database import get_db
from packages.api.features.auth.dependencies import get_current_profile
from packages.api.features.profiles.models import Profile
from packages.api.features.verification import selfie_service
from packages.api.features.verification.schemas import (
    SelfieConfirmIn,
    SelfiePresignIn,
    SelfiePresignOut,
    VerificationStatusOut,
)

router = APIRouter()

DbDependency = Annotated[DbSession, Depends(get_db)]
CurrentProfileDependency = Annotated[Profile, Depends(get_current_profile)]


@router.post("/me/selfie/presign", response_model=SelfiePresignOut)
def presign_my_selfie(
    payload: SelfiePresignIn, profile: CurrentProfileDependency
) -> SelfiePresignOut:
    upload_url, s3_key = selfie_service.presign_selfie_upload(profile, payload.content_type)
    return SelfiePresignOut(upload_url=upload_url, s3_key=s3_key)


@router.post("/me/selfie/confirm", response_model=VerificationStatusOut)
def confirm_my_selfie(
    payload: SelfieConfirmIn,
    profile: CurrentProfileDependency,
    db: DbDependency,
) -> VerificationStatusOut:
    verification = selfie_service.confirm_selfie(db, profile, payload.s3_key)
    return VerificationStatusOut(
        status=verification.status,
        submitted_at=verification.created_at,
        reviewed_at=verification.reviewed_at,
    )


@router.get("/me/status", response_model=VerificationStatusOut)
def get_my_verification_status(
    profile: CurrentProfileDependency, db: DbDependency
) -> VerificationStatusOut:
    verification = selfie_service.get_verification_for_profile(db, profile.id)
    if verification is None:
        return VerificationStatusOut(status=None, submitted_at=None, reviewed_at=None)
    return VerificationStatusOut(
        status=verification.status,
        submitted_at=verification.created_at,
        reviewed_at=verification.reviewed_at,
    )
