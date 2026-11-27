"""users deleted_at

Revision ID: a1f3c9e7b2d4
Revises: 35a09b071ce5
Create Date: 2026-11-28 00:00:00.000000

Task 0023 (account deletion): adds `users.deleted_at`, nullable, so a
self-deleted account is distinguishable from an admin-suspended one —
both share `is_active = False`, but only self-deletion sets this field.
A single nullable-column addition; no data migration needed, trivially
reversible.
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a1f3c9e7b2d4'
down_revision: Union[str, None] = '35a09b071ce5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('users', 'deleted_at')
