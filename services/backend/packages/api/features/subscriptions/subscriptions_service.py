"""Subscriptions business logic: plan catalogue, checkout-session creation,
webhook processing, and the `has_active_premium` entitlement check.

`has_active_premium(user_id)` is the single function every Premium-gated
endpoint in this wave (GPS discovery read+write, radius filtering/ranking,
and the compatibility-insights breakdown -- per
`tasks/0010-wave2-deferred-features/plan.md`) must call. It is deliberately
side-effect-free and cheap (one indexed query) so other features can call
it inline on every request.
"""
from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from packages.api.features.subscriptions import payment_provider
from packages.api.features.subscriptions.models import Payment, Subscription

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class PlanDefinition:
    plan: str
    label: str
    duration_days: int
    price_minor_units: int
    currency: str = "INR"


# Pricing per `docs/product-plan.md` §4.3 ("Proposed subscription
# pricing") -- explicitly noted there as an initial, unvalidated
# experiment, not a final price list. Daily is a one-time 24h pass (not a
# recurring charge), matching that section's note.
PLAN_CATALOGUE: dict[str, PlanDefinition] = {
    "daily": PlanDefinition("daily", "Daily Premium", 1, 2_000),
    "weekly": PlanDefinition("weekly", "Weekly Premium", 7, 9_900),
    "monthly": PlanDefinition("monthly", "Monthly Premium", 30, 29_900),
    "quarterly": PlanDefinition("quarterly", "Quarterly Premium", 90, 74_900),
    "annual": PlanDefinition("annual", "Annual Premium", 365, 199_900),
}

PAYMENT_SUCCEEDED_STATUS = "succeeded"
PAYMENT_FAILED_STATUS = "failed"


class UnknownPlanError(ValueError):
    """Raised when a caller requests a plan not in `PLAN_CATALOGUE`."""


def list_plans() -> list[PlanDefinition]:
    """Return the plan catalogue in a stable, user-facing order."""
    order = ["daily", "weekly", "monthly", "quarterly", "annual"]
    return [PLAN_CATALOGUE[key] for key in order]


def _utcnow() -> datetime:
    return datetime.now(UTC)


def has_active_premium(db: DbSession, user_id: uuid.UUID) -> bool:
    """True iff `user_id` has a subscription that is both `status ==
    "active"` AND not yet expired (`expires_at > now()`).

    Both conditions are required: a row can be `status == "active"` but
    stale if nothing has yet run a background expiry sweep, so the time
    check is load-bearing, not redundant. This never raises; a missing
    subscription simply yields False.
    """
    now = _utcnow()
    stmt = select(Subscription.id).where(
        Subscription.user_id == user_id,
        Subscription.status == "active",
        Subscription.expires_at > now,
    )
    return db.scalar(stmt) is not None


def create_checkout_session(user_id: uuid.UUID, plan: str) -> dict[str, Any]:
    """Create a (stub) Razorpay order for `plan` and return the fields the
    client needs to launch checkout. No DB row is written here -- a
    `Payment` row is only ever created once the webhook reports a real
    payment outcome, per the plan.
    """
    definition = PLAN_CATALOGUE.get(plan)
    if definition is None:
        raise UnknownPlanError(f"Unknown plan: {plan!r}")

    order = payment_provider.create_stub_order(
        amount_minor_units=definition.price_minor_units,
        currency=definition.currency,
        notes={"user_id": str(user_id), "plan": plan},
    )
    return {
        "order_id": order["id"],
        "amount_minor_units": order["amount"],
        "currency": order["currency"],
        "key_id": order["key_id"],
        "plan": plan,
    }


def _extend_or_create_subscription(
    db: DbSession, user_id: uuid.UUID, plan: str
) -> Subscription:
    """Activate or extend the user's subscription for `plan`.

    If the user already has an active, unexpired subscription, the new
    period is appended on top of its current `expires_at` (a renewal
    should not shorten what was already paid for). Otherwise a fresh
    `Subscription` row is created starting now.
    """
    definition = PLAN_CATALOGUE[plan]
    duration = timedelta(days=definition.duration_days)
    now = _utcnow()

    existing = db.scalar(
        select(Subscription)
        .where(
            Subscription.user_id == user_id,
            Subscription.status == "active",
            Subscription.expires_at > now,
        )
        .order_by(Subscription.expires_at.desc())
    )
    if existing is not None:
        existing.expires_at = existing.expires_at + duration
        db.add(existing)
        return existing

    subscription = Subscription(
        user_id=user_id,
        plan=plan,
        status="active",
        started_at=now,
        expires_at=now + duration,
    )
    db.add(subscription)
    db.flush()
    return subscription


def get_my_subscription(db: DbSession, user_id: uuid.UUID) -> Subscription | None:
    """Return the caller's "current" subscription for `GET /subscriptions/me`.

    Prefers the most recent row that is both `status == "active"` and not
    yet expired (same two-condition check as `has_active_premium`). If none
    exists, falls back to the single most-recently-created row for this
    user, so an expired or cancelled subscription still surfaces as such
    rather than silently vanishing. Returns `None` only if the user has
    never had a subscription row at all.
    """
    now = _utcnow()
    active = db.scalar(
        select(Subscription)
        .where(
            Subscription.user_id == user_id,
            Subscription.status == "active",
            Subscription.expires_at > now,
        )
        .order_by(Subscription.expires_at.desc())
    )
    if active is not None:
        return active

    return db.scalar(
        select(Subscription)
        .where(Subscription.user_id == user_id)
        .order_by(Subscription.created_at.desc())
    )


def build_sandbox_captured_payload(
    *, user_id: uuid.UUID, plan: str, session_id: str
) -> dict[str, Any]:
    """Build a Razorpay-webhook-shaped `payment.captured` payload for the
    sandbox checkout-completion endpoint
    (`routes.post_sandbox_complete_checkout`).

    `session_id` (the `order_id` the client received from
    `/checkout-session`) is NOT looked up anywhere -- `/checkout-session`
    deliberately persists no pending-checkout row -- it is only used to
    build a unique, traceable fake payment id
    (`pay_sandbox_{session_id}_{random suffix}`). The returned payload has
    exactly the `payload.payment.entity` shape
    `process_razorpay_webhook`/`payment_provider.extract_payment_entity`
    already expect, so the real activation logic runs unmodified.

    Raises `UnknownPlanError` if `plan` isn't in `PLAN_CATALOGUE`, same as
    `create_checkout_session`.
    """
    definition = PLAN_CATALOGUE.get(plan)
    if definition is None:
        raise UnknownPlanError(f"Unknown plan: {plan!r}")

    fake_payment_id = f"pay_sandbox_{session_id}_{uuid.uuid4().hex[:8]}"
    return {
        "entity": "event",
        "event": payment_provider.EVENT_PAYMENT_CAPTURED,
        "payload": {
            "payment": {
                "entity": {
                    "id": fake_payment_id,
                    "amount": definition.price_minor_units,
                    "currency": definition.currency,
                    "status": "captured",
                    "notes": {"user_id": str(user_id), "plan": plan},
                }
            }
        },
    }


class InvalidWebhookSignatureError(ValueError):
    """Raised when a webhook's `X-Razorpay-Signature` fails verification."""


def process_razorpay_webhook(
    db: DbSession, raw_body: bytes, signature: str | None, payload: dict[str, Any]
) -> dict[str, Any]:
    """Verify and process one Razorpay webhook delivery.

    Idempotent on `Payment.provider_payment_id`: if a `Payment` row for
    this exact provider payment id already exists, this is a no-op retry
    and neither a duplicate `Payment` row nor a duplicate subscription
    extension is created.

    Raises `InvalidWebhookSignatureError` if the signature doesn't verify
    (the route layer turns that into a 400). Unrecognized event types are
    acknowledged (not an error -- Razorpay sends many event types this
    endpoint doesn't need to act on) but otherwise ignored.
    """
    if not payment_provider.verify_webhook_signature(raw_body, signature):
        raise InvalidWebhookSignatureError("Invalid X-Razorpay-Signature")

    event = payload.get("event")
    known_events = (payment_provider.EVENT_PAYMENT_CAPTURED, payment_provider.EVENT_PAYMENT_FAILED)
    if event not in known_events:
        logger.info("razorpay_webhook_ignored_event", extra={"event": event})
        return {"received": True}

    entity = payment_provider.extract_payment_entity(payload)
    if entity is None:
        logger.warning("razorpay_webhook_missing_payment_entity", extra={"event": event})
        return {"received": True}

    provider_payment_id = entity.get("id")
    if not provider_payment_id:
        logger.warning("razorpay_webhook_missing_payment_id", extra={"event": event})
        return {"received": True}

    existing_payment = db.scalar(
        select(Payment).where(Payment.provider_payment_id == provider_payment_id)
    )
    if existing_payment is not None:
        # Duplicate delivery (Razorpay retries webhooks until acked) --
        # already processed, so just ack without touching anything else.
        logger.info(
            "razorpay_webhook_duplicate_payment",
            extra={"provider_payment_id": provider_payment_id},
        )
        return {"received": True}

    notes = entity.get("notes") or {}
    if not isinstance(notes, dict):
        # Razorpay renders empty notes as `[]` rather than `{}` in some
        # payload variants; treat that (or any non-dict) as "no notes".
        notes = {}

    raw_user_id = notes.get("user_id")
    plan = notes.get("plan")
    if not raw_user_id or plan not in PLAN_CATALOGUE:
        # `Payment.user_id` is a required (NOT NULL) FK per the schema --
        # with no attributable user there is nothing safe to persist, so
        # just ack and log rather than writing a row with a guessed user.
        logger.warning(
            "razorpay_webhook_unattributable_payment",
            extra={"provider_payment_id": provider_payment_id, "event": event},
        )
        return {"received": True}

    user_id = uuid.UUID(raw_user_id)

    if event == payment_provider.EVENT_PAYMENT_FAILED:
        payment = Payment(
            subscription_id=None,
            user_id=user_id,
            provider="razorpay",
            provider_payment_id=provider_payment_id,
            amount_minor_units=int(entity.get("amount", 0)),
            currency=entity.get("currency", "INR"),
            status=PAYMENT_FAILED_STATUS,
        )
        db.add(payment)
        db.commit()
        return {"received": True}

    # payment.captured: activate/extend the subscription, then record the
    # payment linked to it. Order matters for idempotency-under-retry:
    # if a crash happened between these two commits on the first attempt,
    # the retry would still be short-circuited by the Payment row's
    # uniqueness check above once it exists -- but to keep the window as
    # small as possible, do both writes in one transaction.
    subscription = _extend_or_create_subscription(db, user_id, plan)
    payment = Payment(
        subscription_id=subscription.id,
        user_id=user_id,
        provider="razorpay",
        provider_payment_id=provider_payment_id,
        amount_minor_units=int(entity.get("amount", 0)),
        currency=entity.get("currency", "INR"),
        status=PAYMENT_SUCCEEDED_STATUS,
    )
    db.add(payment)
    db.commit()
    return {"received": True}
