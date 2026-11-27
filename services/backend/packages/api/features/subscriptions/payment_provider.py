"""Razorpay payment-provider integration: a deliberate, documented stub.

Mirrors the plan's requirement ("same spirit as the OTP-SMS stub from
Wave 1"): no real Razorpay API keys are wired this wave, and no network
call is ever made to Razorpay. `create_stub_order` fabricates a response
shaped like Razorpay's real `orders.create` response so the mobile client
integration contract is already correct once real keys are provisioned
later; `verify_webhook_signature` implements Razorpay's real,
currently-documented webhook signature scheme so that part is genuinely
correct today.

Webhook signature scheme (per Razorpay's webhook docs, looked up for this
subtask rather than guessed from memory):
  - The signature is sent in the `X-Razorpay-Signature` request header.
  - It is computed as `hex(HMAC-SHA256(key=webhook_secret,
    message=raw_request_body))` -- i.e. HMAC-SHA256 over the *raw*
    (un-parsed) request body, hex-digested, keyed by a per-account webhook
    secret configured in the Razorpay dashboard.
  - Razorpay also sends a stable `x-razorpay-event-id` header, usable for
    idempotency; this subtask idempotes on `Payment.provider_payment_id`
    instead (the plan's explicit requirement), which is robust even if
    that header is absent (e.g. in tests).

Webhook payload shape (also looked up, not guessed -- top-level `event`
e.g. "payment.captured" / "payment.failed", `payload.payment.entity` with
`id` ("pay_..."), `amount` (minor units), `currency`, `status`,
`order_id`, and `notes` echoed back verbatim from order creation). This
stub's `create_stub_order` sets `notes` to carry `user_id` and `plan` so
the webhook handler can attribute an incoming payment to a user/plan
without needing a separate "pending checkout" table -- the real Razorpay
API supports arbitrary `notes` key/value metadata on orders the same way.
"""
from __future__ import annotations

import hashlib
import hmac
import os
import uuid
from typing import Any

# Clearly-fake placeholder, same convention as other Wave-1/Wave-2 stubs
# (e.g. otp_service's lack of a real SMS provider). Real deployments must
# override this via the env var; this default must never be used in
# production.
_DEFAULT_WEBHOOK_SECRET = "razorpay-webhook-secret-PLACEHOLDER-not-for-prod"

RAZORPAY_SIGNATURE_HEADER = "X-Razorpay-Signature"

EVENT_PAYMENT_CAPTURED = "payment.captured"
EVENT_PAYMENT_FAILED = "payment.failed"


def get_webhook_secret() -> str:
    """Return the (sandboxed) webhook secret used to verify signatures."""
    return os.environ.get("RAZORPAY_WEBHOOK_SECRET", _DEFAULT_WEBHOOK_SECRET)


def get_stub_key_id() -> str:
    """Return the (sandboxed) publishable key id returned to clients.

    Real Razorpay checkout needs a `key_id` to initialize the client SDK.
    No real key is configured this wave, so this is a clearly-fake
    placeholder, overridable via env var for a future sandbox key.
    """
    return os.environ.get("RAZORPAY_KEY_ID", "rzp_test_stub_key_id")


def compute_signature(raw_body: bytes, secret: str) -> str:
    """Compute the hex HMAC-SHA256 digest Razorpay would send for `raw_body`."""
    return hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()


def verify_webhook_signature(raw_body: bytes, signature: str | None) -> bool:
    """Return True iff `signature` matches the expected HMAC for `raw_body`.

    Constant-time comparison (`hmac.compare_digest`) to avoid a timing
    side-channel, per standard webhook-verification practice.
    """
    if not signature:
        return False
    expected = compute_signature(raw_body, get_webhook_secret())
    return hmac.compare_digest(expected, signature)


def create_stub_order(
    *, amount_minor_units: int, currency: str, notes: dict[str, str]
) -> dict[str, Any]:
    """Fabricate a Razorpay-shaped order-creation response.

    No network call is made. The returned `id` looks like a real Razorpay
    order id (`order_...`) purely so client code already expects the real
    shape; it is never persisted as a `Payment.provider_payment_id` (that
    column is reserved for the real *payment* id Razorpay reports back via
    webhook, per the plan's schema).
    """
    return {
        "id": f"order_stub_{uuid.uuid4().hex[:14]}",
        "entity": "order",
        "amount": amount_minor_units,
        "currency": currency,
        "status": "created",
        "notes": notes,
        "key_id": get_stub_key_id(),
    }


def extract_payment_entity(webhook_payload: dict[str, Any]) -> dict[str, Any] | None:
    """Pull `payload.payment.entity` out of a Razorpay webhook body, or None."""
    payment = webhook_payload.get("payload", {}).get("payment")
    if not isinstance(payment, dict):
        return None
    entity = payment.get("entity")
    if not isinstance(entity, dict):
        return None
    return entity
