"""Selfie service: S3 presign/confirm for verification selfies.

Mirrors `features.profiles.photo_service` exactly (same presign/confirm
pattern, same `boto3` client with no explicit credentials -- instance-role
creds, same `MEDIA_BUCKET_NAME` env var with the same local fallback) but
for a selfie tied to a `Verification` row instead of a `ProfilePhoto` row.
"""
from __future__ import annotations

import uuid
from functools import lru_cache

import boto3
from sqlalchemy.orm import Session as DbSession

from packages.api.features.profiles.models import Profile
from packages.api.features.profiles.photo_service import get_media_bucket_name
from packages.api.features.verification.models import STATUS_PENDING, Verification

PRESIGNED_URL_EXPIRE_SECONDS = 15 * 60
PRESIGNED_GET_URL_EXPIRE_SECONDS = 60 * 60


@lru_cache
def get_s3_client():
    """Return a process-wide cached boto3 S3 client (instance-role creds).

    Deliberately a separate cached client from `photo_service.get_s3_client`
    (not imported from there) so this feature's tests can patch its own
    client independently of the profiles feature's, per each subtask's
    disjoint ownership of test fixtures.
    """
    return boto3.client("s3")


def _extension_for_content_type(content_type: str) -> str:
    mapping = {
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/heic": "heic",
    }
    return mapping.get(content_type.lower(), "bin")


def build_selfie_s3_key(profile_id: uuid.UUID, content_type: str) -> str:
    extension = _extension_for_content_type(content_type)
    return f"verifications/{profile_id}/{uuid.uuid4()}.{extension}"


def presign_selfie_upload(profile: Profile, content_type: str) -> tuple[str, str]:
    """Return (upload_url, s3_key) for a direct client PUT to S3."""
    s3_key = build_selfie_s3_key(profile.id, content_type)
    client = get_s3_client()
    upload_url = client.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": get_media_bucket_name(),
            "Key": s3_key,
            "ContentType": content_type,
        },
        ExpiresIn=PRESIGNED_URL_EXPIRE_SECONDS,
    )
    return upload_url, s3_key


def build_selfie_url(s3_key: str) -> str:
    """Resolve a stored selfie's bare `s3_key` into a viewable (GET) URL.

    Same pattern as `profiles.photo_service.build_photo_url`: the media
    bucket is private, so this generates a presigned GET URL via the same
    client/bucket, GET instead of PUT, with a display-suited expiry. This
    is the one S3-key-to-URL helper the admin review queue uses to surface
    a viewable selfie.
    """
    client = get_s3_client()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": get_media_bucket_name(), "Key": s3_key},
        ExpiresIn=PRESIGNED_GET_URL_EXPIRE_SECONDS,
    )


def get_verification_for_profile(db: DbSession, profile_id: uuid.UUID) -> Verification | None:
    return db.query(Verification).filter(Verification.profile_id == profile_id).first()


def confirm_selfie(db: DbSession, profile: Profile, s3_key: str) -> Verification:
    """Record a confirmed selfie upload, (re)submitting the profile for review.

    If this profile has never submitted before, creates a new `pending`
    `Verification` row. If one already exists (e.g. resubmission after a
    `rejected` outcome, or re-uploading while still `pending`), the existing
    row is updated in place: `selfie_s3_key` is replaced, `status` is reset
    to `pending`, and any prior review decision (`reviewed_by_user_id`/
    `reviewed_at`) is cleared, since a new selfie needs a fresh review.
    An already-`approved` verification can still be resubmitted (e.g. a
    reviewer error, or a selfie refresh request) -- this endpoint does not
    special-case `approved` as locked, since the plan does not specify that
    restriction.
    """
    verification = get_verification_for_profile(db, profile.id)
    if verification is None:
        verification = Verification(
            profile_id=profile.id,
            selfie_s3_key=s3_key,
            status=STATUS_PENDING,
        )
        db.add(verification)
    else:
        verification.selfie_s3_key = s3_key
        verification.status = STATUS_PENDING
        verification.reviewed_by_user_id = None
        verification.reviewed_at = None

    db.commit()
    db.refresh(verification)
    return verification
