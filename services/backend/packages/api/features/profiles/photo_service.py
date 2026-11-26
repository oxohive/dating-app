"""Photo service: S3 presigned upload + confirm for profile photos.

Uses `boto3` with no explicit credentials — the EC2 instance has IAM
permissions to the media bucket via its instance role (per the plan). The
bucket name isn't yet a `core.config.Settings` field (adding one is out of
scope for this subtask — core/ is off limits), so it's read directly from
the `MEDIA_BUCKET_NAME` env var with a documented local fallback.
"""
from __future__ import annotations

import os
import uuid
from functools import lru_cache

import boto3
from sqlalchemy.orm import Session as DbSession

from packages.api.features.profiles.models import Profile, ProfilePhoto

PRESIGNED_URL_EXPIRE_SECONDS = 15 * 60
PRESIGNED_GET_URL_EXPIRE_SECONDS = 60 * 60


def get_media_bucket_name() -> str:
    return os.environ.get("MEDIA_BUCKET_NAME", "dating-app-media-dev")


@lru_cache
def get_s3_client():
    """Return a process-wide cached boto3 S3 client (instance-role creds)."""
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


def build_photo_s3_key(profile_id: uuid.UUID, content_type: str) -> str:
    extension = _extension_for_content_type(content_type)
    return f"profiles/{profile_id}/{uuid.uuid4()}.{extension}"


def presign_photo_upload(profile: Profile, content_type: str) -> tuple[str, str]:
    """Return (upload_url, s3_key) for a direct client PUT to S3."""
    s3_key = build_photo_s3_key(profile.id, content_type)
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


def build_photo_url(s3_key: str) -> str:
    """Resolve a stored photo's bare `s3_key` into a viewable (GET) URL.

    The media bucket is private (no public/CDN URL scheme exists yet), so
    this generates a presigned GET URL the same way `presign_photo_upload`
    generates a presigned PUT URL -- same client, same bucket, GET instead
    of PUT and a longer expiry suited to display rather than upload.

    This is the single S3-key-to-usable-URL helper for the whole backend;
    every endpoint that returns a photo (GET /profiles/me, GET
    /profiles/{id}, GET /discovery/feed, GET /matches, GET /conversations)
    calls this rather than reinventing URL resolution.
    """
    client = get_s3_client()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": get_media_bucket_name(), "Key": s3_key},
        ExpiresIn=PRESIGNED_GET_URL_EXPIRE_SECONDS,
    )


def _photo_sort_key(photo: ProfilePhoto) -> tuple[int, int]:
    """Primary photo first, then ascending position."""
    return (0 if photo.is_primary else 1, photo.position)


def ordered_photo_urls(photos: list[ProfilePhoto]) -> list[str]:
    """Return every photo's resolved URL, primary first then by position."""
    return [build_photo_url(photo.s3_key) for photo in sorted(photos, key=_photo_sort_key)]


def primary_photo_url(photos: list[ProfilePhoto]) -> str | None:
    """Return the resolved URL of the profile's primary (or first) photo, if any."""
    urls = ordered_photo_urls(photos)
    return urls[0] if urls else None


def confirm_photo(
    db: DbSession, profile: Profile, s3_key: str, position: int
) -> ProfilePhoto:
    """Record a confirmed upload as a `profile_photos` row.

    The first photo recorded for a profile is marked primary; later ones
    are not (the owner can re-order/re-primary in a later wave — not part
    of this subtask's endpoint contract).
    """
    has_existing = db.query(ProfilePhoto).filter(ProfilePhoto.profile_id == profile.id).count()
    photo = ProfilePhoto(
        profile_id=profile.id,
        s3_key=s3_key,
        position=position,
        is_primary=(has_existing == 0),
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)
    return photo
