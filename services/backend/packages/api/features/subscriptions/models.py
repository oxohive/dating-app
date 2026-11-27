"""Subscriptions ORM models: Subscription, Payment.

This module OWNS the `subscriptions` and `payments` tables (per the plan's
cross-feature-model-import rule, other features must import from here
rather than redefine either class). `User` is imported read-only from
`features/auth/models.py` -- never redefined here.

`plan` and `status` on `Subscription`, and `status` on `Payment`, are
plain `String` columns (not a DB-level enum type) holding one of a fixed
set of application-level values -- the same convention already used by
every other feature in this codebase (e.g. `Report.status`,
`Profile.gender`): validated at the schema/service layer, not via a
Postgres ENUM, so adding a new value never needs a migration that alters
a type.

Allowed `Subscription.plan` values: "daily" | "weekly" | "monthly" |
"quarterly" | "annual" (see `subscriptions_service.PLAN_CATALOGUE`).
Allowed `Subscription.status` values: "active" | "expired" | "cancelled".
Allowed `Payment.status` values: "pending" | "succeeded" | "failed" |
"refunded".
"""
from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from packages.api.core.database import Base


def _utcnow() -> datetime:
    return datetime.now(UTC)


class Subscription(Base):
    """One Premium subscription period for a user.

    A user may accumulate multiple rows over time (one per purchased
    period); `subscriptions_service.has_active_premium` looks for any row
    that is currently `status == "active"` and not yet expired.
    """

    __tablename__ = "subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    plan: Mapped[str] = mapped_column(String(16), nullable=False)
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default="active", index=True
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    payments: Mapped[list[Payment]] = relationship(back_populates="subscription")


class Payment(Base):
    """One payment-provider transaction, linked to a subscription once it
    succeeds (a payment can precede subscription activation -- the row is
    created from the webhook, which is what actually tells us the payment
    succeeded and lets us activate/extend the subscription).

    `provider_payment_id` is unique and is the idempotency key: a
    retried/duplicate webhook delivery for the same provider payment id
    must not create a second row.
    """

    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    subscription_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("subscriptions.id"), nullable=True, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    provider: Mapped[str] = mapped_column(String(32), nullable=False, default="razorpay")
    provider_payment_id: Mapped[str] = mapped_column(
        String(128), nullable=False, unique=True, index=True
    )
    amount_minor_units: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="INR")
    status: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    subscription: Mapped[Subscription | None] = relationship(back_populates="payments")
