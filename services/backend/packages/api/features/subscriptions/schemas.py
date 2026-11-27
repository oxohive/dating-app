"""Subscriptions request/response schemas."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel


class PlanOut(BaseModel):
    """One entry in the plan catalogue."""

    plan: str
    label: str
    duration_days: int
    price_minor_units: int
    currency: str


class PlanCatalogueResponse(BaseModel):
    plans: list[PlanOut]


class CheckoutSessionRequest(BaseModel):
    plan: str


class CheckoutSessionResponse(BaseModel):
    """Everything the client needs to hand to the Razorpay checkout SDK.

    `key_id` and `order_id` are stub values this wave (see
    `payment_provider.create_stub_order`) -- shaped like the real Razorpay
    response so the client integration contract doesn't change once real
    keys are wired in a later wave.

    `session_id` is purely additive (task 0010 integration step): it is
    always set to the exact same value as `order_id` -- the mobile client
    needs a `session_id`-named field to pass to
    `POST /checkout-session/{session_id}/sandbox-complete`, but `order_id`
    stays as-is for every existing caller.
    """

    order_id: str
    amount_minor_units: int
    currency: str
    key_id: str
    plan: str
    session_id: str


class SandboxCompleteCheckoutRequest(BaseModel):
    """Body for `POST /checkout-session/{session_id}/sandbox-complete`.

    `plan` is the plan the client is completing checkout for -- the same
    plan it already passed to `/checkout-session`, which it still has in
    scope from its own UI state. See `routes.post_sandbox_complete_checkout`
    for why this sandbox-only endpoint exists at all.
    """

    plan: str


class SubscriptionOut(BaseModel):
    id: uuid.UUID
    plan: str
    status: str
    started_at: datetime
    expires_at: datetime

    model_config = {"from_attributes": True}


class PaymentOut(BaseModel):
    """One of the caller's own payment rows, as returned by
    `GET /subscriptions/payments` (task 0012, subtask B8).

    Field names match the `Payment` ORM exactly, same convention as
    `SubscriptionOut`. This is a self-service view -- unlike admin's
    `PaymentAdminOut`, it is always scoped to the authenticated user's
    own `user_id`, never any other user's payments.
    """

    model_config = {"from_attributes": True}

    id: uuid.UUID
    subscription_id: uuid.UUID | None
    provider: str
    provider_payment_id: str
    amount_minor_units: int
    currency: str
    status: str
    created_at: datetime


class WebhookAckResponse(BaseModel):
    """Always 200 with this body once the signature checks out, per
    Razorpay's recommendation to ack quickly and avoid provider retries.
    """

    received: bool = True
