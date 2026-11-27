"""Real tests for the subscriptions feature: plan catalogue, checkout
session creation, webhook signature verification, webhook idempotency,
and `has_active_premium` correctness.
"""
from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from packages.api.features.subscriptions import payment_provider, subscriptions_service
from packages.api.features.subscriptions.models import Payment, Subscription

from .conftest import make_user


def _razorpay_event(
    *, event: str, payment_id: str, amount: int, notes: dict | None = None
) -> dict:
    return {
        "entity": "event",
        "account_id": "acc_stub",
        "event": event,
        "contains": ["payment"],
        "payload": {
            "payment": {
                "entity": {
                    "id": payment_id,
                    "entity": "payment",
                    "amount": amount,
                    "currency": "INR",
                    "status": "captured" if event == "payment.captured" else "failed",
                    "order_id": "order_stub_abc123",
                    "notes": notes if notes is not None else {},
                    "created_at": 1700000000,
                }
            }
        },
        "created_at": 1700000001,
    }


def _signed_webhook_request(payload: dict, *, secret: str | None = None) -> tuple[bytes, str]:
    raw_body = json.dumps(payload).encode("utf-8")
    signature = payment_provider.compute_signature(
        raw_body, secret or payment_provider.get_webhook_secret()
    )
    return raw_body, signature


# --- Plan catalogue -------------------------------------------------------


def test_plan_catalogue_response_shape(client) -> None:
    response = client.get("/subscriptions/plans")

    assert response.status_code == 200
    body = response.json()
    plans = body["plans"]
    assert len(plans) == 5
    plan_keys = {p["plan"] for p in plans}
    assert plan_keys == {"daily", "weekly", "monthly", "quarterly", "annual"}
    for p in plans:
        assert isinstance(p["duration_days"], int) and p["duration_days"] > 0
        assert isinstance(p["price_minor_units"], int) and p["price_minor_units"] > 0
        assert p["currency"] == "INR"
        assert isinstance(p["label"], str) and p["label"]


# --- Checkout session creation --------------------------------------------


def test_checkout_session_creation(client, as_user, db: DbSession) -> None:
    user = make_user(db)
    as_user(user)

    response = client.post("/subscriptions/checkout-session", json={"plan": "monthly"})

    assert response.status_code == 200
    body = response.json()
    assert body["plan"] == "monthly"
    assert body["amount_minor_units"] == 29_900
    assert body["currency"] == "INR"
    assert body["order_id"].startswith("order_")
    assert body["key_id"]
    # No DB row should be written yet -- only the webhook creates one.
    assert db.scalar(select(Payment)) is None


def test_checkout_session_unknown_plan_is_400(client, as_user, db: DbSession) -> None:
    user = make_user(db)
    as_user(user)

    response = client.post("/subscriptions/checkout-session", json={"plan": "lifetime"})

    assert response.status_code == 400


def test_checkout_session_requires_auth(client) -> None:
    response = client.post("/subscriptions/checkout-session", json={"plan": "monthly"})
    assert response.status_code == 401


# --- Webhook signature verification ---------------------------------------


def test_webhook_valid_signature_is_accepted(client, db: DbSession) -> None:
    user = make_user(db)
    payload = _razorpay_event(
        event="payment.captured",
        payment_id="pay_valid_sig_1",
        amount=2_000,
        notes={"user_id": str(user.id), "plan": "daily"},
    )
    raw_body, signature = _signed_webhook_request(payload)

    response = client.post(
        "/subscriptions/webhooks/razorpay",
        content=raw_body,
        headers={
            "Content-Type": "application/json",
            payment_provider.RAZORPAY_SIGNATURE_HEADER: signature,
        },
    )

    assert response.status_code == 200
    assert response.json()["received"] is True


def test_webhook_invalid_signature_is_rejected(client, db: DbSession) -> None:
    user = make_user(db)
    payload = _razorpay_event(
        event="payment.captured",
        payment_id="pay_invalid_sig_1",
        amount=2_000,
        notes={"user_id": str(user.id), "plan": "daily"},
    )
    raw_body = json.dumps(payload).encode("utf-8")

    response = client.post(
        "/subscriptions/webhooks/razorpay",
        content=raw_body,
        headers={
            "Content-Type": "application/json",
            payment_provider.RAZORPAY_SIGNATURE_HEADER: "0" * 64,
        },
    )

    assert response.status_code == 400
    stored = db.scalar(select(Payment).where(Payment.provider_payment_id == "pay_invalid_sig_1"))
    assert stored is None


def test_webhook_missing_signature_is_rejected(client, db: DbSession) -> None:
    user = make_user(db)
    payload = _razorpay_event(
        event="payment.captured",
        payment_id="pay_missing_sig_1",
        amount=2_000,
        notes={"user_id": str(user.id), "plan": "daily"},
    )
    raw_body = json.dumps(payload).encode("utf-8")

    response = client.post(
        "/subscriptions/webhooks/razorpay",
        content=raw_body,
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 400


# --- Webhook idempotency ---------------------------------------------------


def test_webhook_captured_activates_subscription_once(client, db: DbSession) -> None:
    user = make_user(db)
    payload = _razorpay_event(
        event="payment.captured",
        payment_id="pay_idem_1",
        amount=29_900,
        notes={"user_id": str(user.id), "plan": "monthly"},
    )
    raw_body, signature = _signed_webhook_request(payload)
    headers = {
        "Content-Type": "application/json",
        payment_provider.RAZORPAY_SIGNATURE_HEADER: signature,
    }

    first = client.post("/subscriptions/webhooks/razorpay", content=raw_body, headers=headers)
    second = client.post("/subscriptions/webhooks/razorpay", content=raw_body, headers=headers)

    assert first.status_code == 200
    assert second.status_code == 200

    payments = db.scalars(
        select(Payment).where(Payment.provider_payment_id == "pay_idem_1")
    ).all()
    assert len(payments) == 1
    assert payments[0].status == "succeeded"
    assert payments[0].amount_minor_units == 29_900

    subscriptions = db.scalars(select(Subscription).where(Subscription.user_id == user.id)).all()
    assert len(subscriptions) == 1
    subscription = subscriptions[0]
    assert subscription.status == "active"
    assert payments[0].subscription_id == subscription.id
    original_expires_at = subscription.expires_at

    # A second, distinct webhook delivery for a *different* payment id on
    # the same user should extend (not replace) the existing subscription
    # rather than creating a second row.
    renewal_payload = _razorpay_event(
        event="payment.captured",
        payment_id="pay_idem_2",
        amount=29_900,
        notes={"user_id": str(user.id), "plan": "monthly"},
    )
    renewal_body, renewal_signature = _signed_webhook_request(renewal_payload)
    renewal_response = client.post(
        "/subscriptions/webhooks/razorpay",
        content=renewal_body,
        headers={
            "Content-Type": "application/json",
            payment_provider.RAZORPAY_SIGNATURE_HEADER: renewal_signature,
        },
    )
    assert renewal_response.status_code == 200

    db.expire_all()
    subscriptions_after_renewal = db.scalars(
        select(Subscription).where(Subscription.user_id == user.id)
    ).all()
    assert len(subscriptions_after_renewal) == 1
    assert subscriptions_after_renewal[0].expires_at > original_expires_at


def test_webhook_failed_payment_does_not_create_subscription(client, db: DbSession) -> None:
    user = make_user(db)
    payload = _razorpay_event(
        event="payment.failed",
        payment_id="pay_failed_1",
        amount=9_900,
        notes={"user_id": str(user.id), "plan": "weekly"},
    )
    raw_body, signature = _signed_webhook_request(payload)

    response = client.post(
        "/subscriptions/webhooks/razorpay",
        content=raw_body,
        headers={
            "Content-Type": "application/json",
            payment_provider.RAZORPAY_SIGNATURE_HEADER: signature,
        },
    )

    assert response.status_code == 200
    payment = db.scalar(select(Payment).where(Payment.provider_payment_id == "pay_failed_1"))
    assert payment is not None
    assert payment.status == "failed"
    assert payment.subscription_id is None
    assert db.scalar(select(Subscription).where(Subscription.user_id == user.id)) is None


# --- has_active_premium -----------------------------------------------------


def test_has_active_premium_false_when_no_subscription(db: DbSession) -> None:
    user = make_user(db)
    assert subscriptions_service.has_active_premium(db, user.id) is False


def test_has_active_premium_true_when_active_and_unexpired(db: DbSession) -> None:
    user = make_user(db)
    db.add(
        Subscription(
            user_id=user.id,
            plan="monthly",
            status="active",
            started_at=datetime.now(UTC),
            expires_at=datetime.now(UTC) + timedelta(days=10),
        )
    )
    db.commit()

    assert subscriptions_service.has_active_premium(db, user.id) is True


def test_has_active_premium_false_when_expired(db: DbSession) -> None:
    user = make_user(db)
    db.add(
        Subscription(
            user_id=user.id,
            plan="monthly",
            status="active",
            started_at=datetime.now(UTC) - timedelta(days=40),
            expires_at=datetime.now(UTC) - timedelta(days=10),
        )
    )
    db.commit()

    assert subscriptions_service.has_active_premium(db, user.id) is False


def test_has_active_premium_false_when_cancelled_even_if_not_yet_expired(db: DbSession) -> None:
    user = make_user(db)
    db.add(
        Subscription(
            user_id=user.id,
            plan="monthly",
            status="cancelled",
            started_at=datetime.now(UTC),
            expires_at=datetime.now(UTC) + timedelta(days=10),
        )
    )
    db.commit()

    assert subscriptions_service.has_active_premium(db, user.id) is False


def test_has_active_premium_for_unknown_user_id(db: DbSession) -> None:
    assert subscriptions_service.has_active_premium(db, uuid.uuid4()) is False


# --- GET /me ----------------------------------------------------------------


def test_get_my_subscription_404_when_never_subscribed(client, as_user, db: DbSession) -> None:
    user = make_user(db)
    as_user(user)

    response = client.get("/subscriptions/me")

    assert response.status_code == 404


def test_get_my_subscription_200_with_right_shape_when_subscribed(
    client, as_user, db: DbSession
) -> None:
    user = make_user(db)
    subscription = Subscription(
        user_id=user.id,
        plan="monthly",
        status="active",
        started_at=datetime.now(UTC),
        expires_at=datetime.now(UTC) + timedelta(days=30),
    )
    db.add(subscription)
    db.commit()
    as_user(user)

    response = client.get("/subscriptions/me")

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == str(subscription.id)
    assert body["plan"] == "monthly"
    assert body["status"] == "active"
    assert "started_at" in body
    assert "expires_at" in body


def test_get_my_subscription_requires_auth(client) -> None:
    response = client.get("/subscriptions/me")
    assert response.status_code == 401


# --- POST /checkout-session/{session_id}/sandbox-complete -------------------


def test_sandbox_complete_checkout_activates_subscription_and_payment(
    client, as_user, db: DbSession
) -> None:
    user = make_user(db)
    as_user(user)

    checkout_response = client.post(
        "/subscriptions/checkout-session", json={"plan": "monthly"}
    )
    assert checkout_response.status_code == 200
    session_id = checkout_response.json()["session_id"]
    assert session_id == checkout_response.json()["order_id"]

    complete_response = client.post(
        f"/subscriptions/checkout-session/{session_id}/sandbox-complete",
        json={"plan": "monthly"},
    )

    assert complete_response.status_code == 200
    assert complete_response.json()["received"] is True

    db.expire_all()
    subscription = db.scalar(select(Subscription).where(Subscription.user_id == user.id))
    assert subscription is not None
    assert subscription.status == "active"
    assert subscription.expires_at.replace(tzinfo=UTC) > datetime.now(UTC)

    payment = db.scalar(select(Payment).where(Payment.subscription_id == subscription.id))
    assert payment is not None
    assert payment.status == "succeeded"
    assert payment.user_id == user.id

    assert subscriptions_service.has_active_premium(db, user.id) is True


def test_sandbox_complete_checkout_unknown_plan_is_400(
    client, as_user, db: DbSession
) -> None:
    user = make_user(db)
    as_user(user)

    checkout_response = client.post(
        "/subscriptions/checkout-session", json={"plan": "monthly"}
    )
    session_id = checkout_response.json()["session_id"]

    response = client.post(
        f"/subscriptions/checkout-session/{session_id}/sandbox-complete",
        json={"plan": "lifetime"},
    )

    assert response.status_code == 400


def test_sandbox_complete_checkout_requires_auth(client) -> None:
    response = client.post(
        "/subscriptions/checkout-session/order_stub_whatever/sandbox-complete",
        json={"plan": "monthly"},
    )
    assert response.status_code == 401
