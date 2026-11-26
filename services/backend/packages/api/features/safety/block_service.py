"""Block service: create/list blocks, enforce block in discovery/messaging.

Discovery (subtask B2) and messaging (subtask B3's own `message_service`)
both query `Block` directly via `packages.api.features.safety.models.Block`
for their respective exclusion/denial checks; this module only owns
*creating* blocks.
"""
from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from packages.api.features.profiles.models import Profile
from packages.api.features.safety.models import Block


def create_block(
    db: Session, blocker_profile_id: uuid.UUID, blocked_profile_id: uuid.UUID
) -> Block:
    """Create a block, idempotently. Returns the existing block if one is already there.

    Raises 400 if a profile tries to block itself, 404 if the target
    profile doesn't exist.
    """
    if blocker_profile_id == blocked_profile_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot block yourself"
        )

    target_exists = db.scalar(select(Profile.id).where(Profile.id == blocked_profile_id))
    if target_exists is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    existing = db.scalar(
        select(Block).where(
            Block.blocker_profile_id == blocker_profile_id,
            Block.blocked_profile_id == blocked_profile_id,
        )
    )
    if existing is not None:
        return existing

    block = Block(blocker_profile_id=blocker_profile_id, blocked_profile_id=blocked_profile_id)
    db.add(block)
    db.commit()
    db.refresh(block)
    return block
