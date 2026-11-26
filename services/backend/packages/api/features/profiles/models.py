"""Profile ORM models: Profile, ProfilePhoto.

Imported read-only by every other backend subtask that needs to query/join
on `profiles` (per the plan's cross-feature-import rule) — never redefine
either class elsewhere.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from packages.api.core.database import Base


class Profile(Base):
    """A user's dating profile (one-to-one with `User`, created at onboarding)."""

    __tablename__ = "profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False, index=True
    )
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    gender: Mapped[str] = mapped_column(String(32), nullable=False)
    orientation_preferences: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    relationship_intention: Mapped[str] = mapped_column(String(32), nullable=False)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    interests: Mapped[list | None] = mapped_column(JSON, nullable=True)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    locality: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    photos: Mapped[list[ProfilePhoto]] = relationship(
        back_populates="profile", cascade="all, delete-orphan", order_by="ProfilePhoto.position"
    )


class ProfilePhoto(Base):
    """One uploaded photo belonging to a profile."""

    __tablename__ = "profile_photos"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    profile_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("profiles.id"), nullable=False, index=True
    )
    s3_key: Mapped[str] = mapped_column(String(512), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    profile: Mapped[Profile] = relationship(back_populates="photos")
