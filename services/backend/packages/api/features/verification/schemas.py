"""Verification request/response schemas."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel


class SelfiePresignIn(BaseModel):
    content_type: str


class SelfiePresignOut(BaseModel):
    upload_url: str
    s3_key: str


class SelfieConfirmIn(BaseModel):
    s3_key: str


class VerificationStatusOut(BaseModel):
    """The authenticated user's own verification status.

    `status` is `None` when the profile has never submitted a selfie (i.e.
    no `Verification` row exists yet) -- distinguishing "not yet submitted"
    from any of the three stored statuses, per the endpoint contract.
    """

    status: str | None
    submitted_at: datetime | None = None
    reviewed_at: datetime | None = None


class VerificationAdminOut(BaseModel):
    """A pending verification row, as returned by the admin review queue.

    `selfie_url` is a resolved, directly-viewable presigned URL (never the
    bare `selfie_s3_key`) -- same URL-resolution pattern as
    `profiles.photo_service.build_photo_url`, via
    `selfie_service.build_selfie_url`.
    """

    id: uuid.UUID
    profile_id: uuid.UUID
    display_name: str
    status: str
    selfie_url: str | None
    created_at: datetime
    reviewed_by_user_id: uuid.UUID | None
    reviewed_at: datetime | None


class VerificationReviewIn(BaseModel):
    """Body for `POST /admin/verifications/{id}/review`."""

    decision: str  # "approve" | "reject"
