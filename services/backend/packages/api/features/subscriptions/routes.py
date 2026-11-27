"""Subscriptions feature routes.

`GET /plans` (catalogue), `POST /checkout-session` (start a purchase),
`GET /me` (the caller's current subscription), `POST
/checkout-session/{session_id}/sandbox-complete` (sandbox-only checkout
completion -- see that route's docstring), and `POST /webhooks/razorpay`
(provider webhook -- unauthenticated by design, since Razorpay itself
calls it; integrity is enforced via HMAC signature verification instead of
a bearer token).
"""
from __future__ import annotations

import json
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session as DbSession

from packages.api.core.database import get_db
from packages.api.features.auth.dependencies import get_current_user
from packages.api.features.auth.models import User
from packages.api.features.subscriptions import payment_provider, subscriptions_service
from packages.api.features.subscriptions.payment_provider import RAZORPAY_SIGNATURE_HEADER
from packages.api.features.subscriptions.schemas import (
    CheckoutSessionRequest,
    CheckoutSessionResponse,
    PaymentOut,
    PlanCatalogueResponse,
    PlanOut,
    SandboxCompleteCheckoutRequest,
    SubscriptionOut,
    WebhookAckResponse,
)

router = APIRouter()

DbDependency = Annotated[DbSession, Depends(get_db)]
CurrentUserDependency = Annotated[User, Depends(get_current_user)]


@router.get("/plans", response_model=PlanCatalogueResponse)
def get_plan_catalogue() -> PlanCatalogueResponse:
    """List the available subscription plans and their prices."""
    plans = [
        PlanOut(
            plan=definition.plan,
            label=definition.label,
            duration_days=definition.duration_days,
            price_minor_units=definition.price_minor_units,
            currency=definition.currency,
        )
        for definition in subscriptions_service.list_plans()
    ]
    return PlanCatalogueResponse(plans=plans)


@router.post("/checkout-session", response_model=CheckoutSessionResponse)
def post_checkout_session(
    body: CheckoutSessionRequest, user: CurrentUserDependency
) -> CheckoutSessionResponse:
    """Create a (stub) Razorpay checkout session/order for `body.plan`."""
    try:
        session = subscriptions_service.create_checkout_session(user.id, body.plan)
    except subscriptions_service.UnknownPlanError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return CheckoutSessionResponse(**session, session_id=session["order_id"])


@router.get("/me", response_model=SubscriptionOut)
def get_subscription_me(
    user: CurrentUserDependency, db: DbDependency
) -> SubscriptionOut:
    """Return the caller's current subscription, or 404 if they've never
    subscribed. See `subscriptions_service.get_my_subscription` for exactly
    which row counts as "current".
    """
    subscription = subscriptions_service.get_my_subscription(db, user.id)
    if subscription is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return SubscriptionOut.model_validate(subscription)


@router.get("/payments", response_model=list[PaymentOut])
def get_my_payments(user: CurrentUserDependency, db: DbDependency) -> list[PaymentOut]:
    """Return the caller's own payment history, newest first (task 0012,
    subtask B8). Always scoped to the authenticated user -- see
    `subscriptions_service.list_payments_for_user`.
    """
    payments = subscriptions_service.list_payments_for_user(db, user.id)
    return [PaymentOut.model_validate(payment) for payment in payments]


# SANDBOX-ONLY: simulates a Razorpay `payment.captured` webhook so the
# sandboxed checkout flow (no real Razorpay keys this wave) is exercisable
# end-to-end from the client. This endpoint MUST BE REMOVED once real
# Razorpay keys are wired in a future wave.
@router.post(
    "/checkout-session/{session_id}/sandbox-complete", response_model=WebhookAckResponse
)
def post_sandbox_complete_checkout(
    session_id: str,
    body: SandboxCompleteCheckoutRequest,
    user: CurrentUserDependency,
    db: DbDependency,
) -> WebhookAckResponse:
    """SANDBOX-ONLY convenience endpoint -- MUST BE REMOVED once real
    Razorpay keys are wired in a future wave.

    `/checkout-session` deliberately persists no pending-checkout row (B4's
    design), so there is nothing for a real webhook to complete against in
    this sandbox. This endpoint fakes a `payment.captured` delivery for
    `session_id` (the `order_id` the client received from
    `/checkout-session`) instead -- `session_id` is NOT looked up anywhere,
    it's only used to build a unique, traceable fake payment id. The real
    activation logic is reused verbatim via
    `subscriptions_service.process_razorpay_webhook` (computing a real HMAC
    signature over the fabricated payload first) rather than duplicated
    here.
    """
    try:
        payload = subscriptions_service.build_sandbox_captured_payload(
            user_id=user.id, plan=body.plan, session_id=session_id
        )
    except subscriptions_service.UnknownPlanError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    raw_body = json.dumps(payload).encode("utf-8")
    signature = payment_provider.compute_signature(raw_body, payment_provider.get_webhook_secret())
    result = subscriptions_service.process_razorpay_webhook(db, raw_body, signature, payload)
    return WebhookAckResponse(received=result.get("received", True))


@router.post("/webhooks/razorpay", response_model=WebhookAckResponse)
async def post_razorpay_webhook(
    request: Request,
    db: DbDependency,
    x_razorpay_signature: Annotated[str | None, Header(alias=RAZORPAY_SIGNATURE_HEADER)] = None,
) -> WebhookAckResponse:
    """Razorpay webhook receiver: HMAC-signature-verified, idempotent.

    Verification is done against the *raw* request body (per Razorpay's
    documented scheme), so this reads `request.body()` directly rather
    than relying on a parsed Pydantic model for the signature check --
    the parsed JSON is used only after the signature has already been
    confirmed to match those exact bytes.
    """
    raw_body = await request.body()
    try:
        payload = await request.json()
    except ValueError:
        payload = {}

    try:
        result = subscriptions_service.process_razorpay_webhook(
            db, raw_body, x_razorpay_signature, payload
        )
    except subscriptions_service.InvalidWebhookSignatureError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return WebhookAckResponse(received=result.get("received", True))
