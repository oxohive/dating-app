"""Real tests for the admin feature: require_admin gating, user search,
suspend, report list/resolve, subscription/payment monitoring, the
payment-refund workflow, and the admin audit log (task 0012, subtask B8).
"""
from __future__ import annotations

import uuid

from sqlalchemy.orm import Session as DbSession

from packages.api.features.admin import admin_service
from packages.api.features.admin.models import AdminAuditLog
from packages.api.features.auth.models import User
from packages.api.features.safety.models import Report
from packages.api.features.subscriptions.models import Payment, Subscription
from packages.api.features.verification.models import (
    STATUS_APPROVED,
    STATUS_PENDING,
    STATUS_REJECTED,
    Verification,
)

from .conftest import (
    make_payment,
    make_subscription,
    make_user,
    make_user_and_profile,
    make_verification,
)


def test_non_admin_gets_403_on_every_admin_endpoint(client, as_user, db: DbSession) -> None:
    regular_user = make_user(db, is_admin=False)
    as_user(regular_user)

    assert client.get("/admin/users").status_code == 403
    assert client.post(f"/admin/users/{uuid.uuid4()}/suspend").status_code == 403
    assert client.get("/admin/reports").status_code == 403
    resolve_response = client.post(
        f"/admin/reports/{uuid.uuid4()}/resolve", json={"action": "dismissed"}
    )
    assert resolve_response.status_code == 403
    assert client.get("/admin/verifications").status_code == 403
    review_response = client.post(
        f"/admin/verifications/{uuid.uuid4()}/review", json={"decision": "approve"}
    )
    assert review_response.status_code == 403
    assert client.get("/admin/subscriptions").status_code == 403
    assert client.get("/admin/payments").status_code == 403
    assert client.post(f"/admin/payments/{uuid.uuid4()}/refund").status_code == 403
    assert client.get("/admin/audit-log").status_code == 403


def test_admin_user_can_list_users(client, as_user, db: DbSession) -> None:
    admin = make_user(db, is_admin=True)
    _target, profile = make_user_and_profile(db, display_name="Alice")
    as_user(admin)

    response = client.get("/admin/users")

    assert response.status_code == 200
    names = [row["display_name"] for row in response.json()]
    assert "Alice" in names


def test_admin_user_search_by_phone(client, as_user, db: DbSession) -> None:
    admin = make_user(db, is_admin=True)
    target, _profile = make_user_and_profile(db, phone_number="+15559998888")
    as_user(admin)

    response = client.get("/admin/users", params={"query": "9998888"})

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["id"] == str(target.id)


def test_admin_user_search_by_display_name(client, as_user, db: DbSession) -> None:
    admin = make_user(db, is_admin=True)
    target, _profile = make_user_and_profile(db, display_name="Zephyr")
    make_user_and_profile(db, display_name="Someone Else")
    as_user(admin)

    response = client.get("/admin/users", params={"query": "zeph"})

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["id"] == str(target.id)


def test_admin_can_suspend_user(client, as_user, db: DbSession) -> None:
    admin = make_user(db, is_admin=True)
    target = make_user(db, is_active=True)
    as_user(admin)

    response = client.post(f"/admin/users/{target.id}/suspend")

    assert response.status_code == 204
    db.expire_all()
    assert db.get(User, target.id).is_active is False


def test_admin_suspend_unknown_user_404s(client, as_user, db: DbSession) -> None:
    admin = make_user(db, is_admin=True)
    as_user(admin)

    response = client.post(f"/admin/users/{uuid.uuid4()}/suspend")

    assert response.status_code == 404


def test_admin_can_list_open_reports(client, as_user, db: DbSession) -> None:
    admin = make_user(db, is_admin=True)
    reporter, _ = make_user_and_profile(db)
    reported, reported_profile = make_user_and_profile(db)
    report = Report(
        reporter_profile_id=uuid.uuid4(),
        reported_profile_id=reported_profile.id,
        reason="spam",
        status="open",
    )
    db.add(report)
    db.commit()
    as_user(admin)

    response = client.get("/admin/reports")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["status"] == "open"


def test_admin_can_resolve_report(client, as_user, db: DbSession) -> None:
    admin = make_user(db, is_admin=True)
    _reported, reported_profile = make_user_and_profile(db)
    report = Report(
        reporter_profile_id=uuid.uuid4(),
        reported_profile_id=reported_profile.id,
        reason="spam",
        status="open",
    )
    db.add(report)
    db.commit()
    report_id = report.id
    as_user(admin)

    response = client.post(f"/admin/reports/{report_id}/resolve", json={"action": "banned"})

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "resolved"
    db.expire_all()
    stored = db.get(Report, report_id)
    assert stored.status == "resolved"
    assert "banned" in stored.details


def test_resolve_report_404_for_unknown_report(client, as_user, db: DbSession) -> None:
    admin = make_user(db, is_admin=True)
    as_user(admin)

    response = client.post(f"/admin/reports/{uuid.uuid4()}/resolve", json={"action": "dismissed"})

    assert response.status_code == 404


def test_search_users_service_function_joins_profile(db: DbSession) -> None:
    _user, profile = make_user_and_profile(db, display_name="Bob")
    rows = admin_service.search_users(db, "bob")
    assert len(rows) == 1
    user, matched_profile = rows[0]
    assert matched_profile.id == profile.id


def test_admin_can_list_pending_verifications(client, as_user, db: DbSession) -> None:
    admin = make_user(db, is_admin=True)
    _target, profile = make_user_and_profile(db, display_name="Dana")
    verification = make_verification(db, profile_id=profile.id, status=STATUS_PENDING)
    # An approved one should not show up in the pending queue.
    _other_target, other_profile = make_user_and_profile(db, display_name="Eve")
    make_verification(db, profile_id=other_profile.id, status=STATUS_APPROVED)
    as_user(admin)

    response = client.get("/admin/verifications")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["id"] == str(verification.id)
    assert body[0]["display_name"] == "Dana"
    assert body[0]["status"] == STATUS_PENDING
    assert body[0]["selfie_url"].startswith("https://")
    assert body[0]["reviewed_by_user_id"] is None
    assert body[0]["reviewed_at"] is None


def test_admin_verifications_filter_by_approved_status(client, as_user, db: DbSession) -> None:
    admin = make_user(db, is_admin=True)
    _pending_target, pending_profile = make_user_and_profile(db, display_name="Pending Pat")
    make_verification(db, profile_id=pending_profile.id, status=STATUS_PENDING)
    _approved_target, approved_profile = make_user_and_profile(db, display_name="Approved Amy")
    approved = make_verification(db, profile_id=approved_profile.id, status=STATUS_APPROVED)
    as_user(admin)

    response = client.get("/admin/verifications", params={"status": "approved"})

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["id"] == str(approved.id)
    assert body[0]["status"] == STATUS_APPROVED


def test_admin_verifications_filter_by_rejected_status(client, as_user, db: DbSession) -> None:
    admin = make_user(db, is_admin=True)
    _pending_target, pending_profile = make_user_and_profile(db, display_name="Pending Pat")
    make_verification(db, profile_id=pending_profile.id, status=STATUS_PENDING)
    _rejected_target, rejected_profile = make_user_and_profile(db, display_name="Rejected Rae")
    rejected = make_verification(db, profile_id=rejected_profile.id, status=STATUS_REJECTED)
    as_user(admin)

    response = client.get("/admin/verifications", params={"status": "rejected"})

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["id"] == str(rejected.id)
    assert body[0]["status"] == STATUS_REJECTED


def test_admin_verifications_status_all_returns_every_status(
    client, as_user, db: DbSession
) -> None:
    admin = make_user(db, is_admin=True)
    _pending_target, pending_profile = make_user_and_profile(db, display_name="Pending Pat")
    make_verification(db, profile_id=pending_profile.id, status=STATUS_PENDING)
    _approved_target, approved_profile = make_user_and_profile(db, display_name="Approved Amy")
    make_verification(db, profile_id=approved_profile.id, status=STATUS_APPROVED)
    _rejected_target, rejected_profile = make_user_and_profile(db, display_name="Rejected Rae")
    make_verification(db, profile_id=rejected_profile.id, status=STATUS_REJECTED)
    as_user(admin)

    response = client.get("/admin/verifications", params={"status": "all"})

    assert response.status_code == 200
    assert len(response.json()) == 3


def test_admin_verifications_invalid_status_is_400(client, as_user, db: DbSession) -> None:
    admin = make_user(db, is_admin=True)
    as_user(admin)

    response = client.get("/admin/verifications", params={"status": "bogus"})

    assert response.status_code == 400


def test_admin_can_approve_a_pending_verification(client, as_user, db: DbSession) -> None:
    admin = make_user(db, is_admin=True)
    _target, profile = make_user_and_profile(db)
    verification = make_verification(db, profile_id=profile.id, status=STATUS_PENDING)
    as_user(admin)

    response = client.post(
        f"/admin/verifications/{verification.id}/review", json={"decision": "approve"}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == STATUS_APPROVED
    assert body["reviewed_by_user_id"] == str(admin.id)
    assert body["reviewed_at"] is not None

    db.expire_all()
    stored = db.get(Verification, verification.id)
    assert stored.status == STATUS_APPROVED
    assert stored.reviewed_by_user_id == admin.id
    assert stored.reviewed_at is not None


def test_admin_can_reject_a_pending_verification(client, as_user, db: DbSession) -> None:
    admin = make_user(db, is_admin=True)
    _target, profile = make_user_and_profile(db)
    verification = make_verification(db, profile_id=profile.id, status=STATUS_PENDING)
    as_user(admin)

    response = client.post(
        f"/admin/verifications/{verification.id}/review", json={"decision": "reject"}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == STATUS_REJECTED
    assert body["reviewed_by_user_id"] == str(admin.id)
    assert body["reviewed_at"] is not None


def test_review_records_the_acting_admin_not_a_client_supplied_reviewer(
    client, as_user, db: DbSession
) -> None:
    """`reviewed_by_user_id` must be the admin making the call -- the review
    request body has no field for the caller to set it to anything else
    (`VerificationReviewRequest` only accepts `decision`), so a second admin
    calling this endpoint is always recorded as the reviewer, never the
    first admin or any other id."""
    first_admin = make_user(db, is_admin=True)
    second_admin = make_user(db, is_admin=True)
    _target, profile = make_user_and_profile(db)
    verification = make_verification(db, profile_id=profile.id, status=STATUS_PENDING)
    as_user(second_admin)

    response = client.post(
        f"/admin/verifications/{verification.id}/review",
        json={
            "decision": "approve",
            "reviewed_by_user_id": str(first_admin.id),
        },
    )

    assert response.status_code == 200
    assert response.json()["reviewed_by_user_id"] == str(second_admin.id)


def test_review_unknown_verification_404s(client, as_user, db: DbSession) -> None:
    admin = make_user(db, is_admin=True)
    as_user(admin)

    response = client.post(
        f"/admin/verifications/{uuid.uuid4()}/review", json={"decision": "approve"}
    )

    assert response.status_code == 404


def test_review_rejects_invalid_decision(client, as_user, db: DbSession) -> None:
    admin = make_user(db, is_admin=True)
    _target, profile = make_user_and_profile(db)
    verification = make_verification(db, profile_id=profile.id, status=STATUS_PENDING)
    as_user(admin)

    response = client.post(
        f"/admin/verifications/{verification.id}/review", json={"decision": "maybe"}
    )

    assert response.status_code == 422


# --- Admin subscriptions/payments monitoring -------------------------------


def test_admin_can_list_subscriptions_with_no_filter(client, as_user, db: DbSession) -> None:
    admin = make_user(db, is_admin=True)
    target, _profile = make_user_and_profile(db)
    active_sub = make_subscription(db, user_id=target.id, plan="monthly", status="active")
    cancelled_sub = make_subscription(db, user_id=target.id, plan="weekly", status="cancelled")
    as_user(admin)

    response = client.get("/admin/subscriptions")

    assert response.status_code == 200
    body = response.json()
    ids = {row["id"] for row in body}
    assert ids == {str(active_sub.id), str(cancelled_sub.id)}
    for row in body:
        assert row["user_id"] == str(target.id)


def test_admin_can_filter_subscriptions_by_status(client, as_user, db: DbSession) -> None:
    admin = make_user(db, is_admin=True)
    target, _profile = make_user_and_profile(db)
    active_sub = make_subscription(db, user_id=target.id, plan="monthly", status="active")
    make_subscription(db, user_id=target.id, plan="weekly", status="expired")
    as_user(admin)

    response = client.get("/admin/subscriptions", params={"status": "active"})

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["id"] == str(active_sub.id)
    assert body[0]["status"] == "active"


def test_admin_subscriptions_empty_list_when_nothing_matches(
    client, as_user, db: DbSession
) -> None:
    admin = make_user(db, is_admin=True)
    target, _profile = make_user_and_profile(db)
    make_subscription(db, user_id=target.id, plan="monthly", status="active")
    as_user(admin)

    response = client.get("/admin/subscriptions", params={"status": "cancelled"})

    assert response.status_code == 200
    assert response.json() == []


def test_admin_subscriptions_invalid_status_is_400(client, as_user, db: DbSession) -> None:
    admin = make_user(db, is_admin=True)
    as_user(admin)

    response = client.get("/admin/subscriptions", params={"status": "bogus"})

    assert response.status_code == 400


def test_admin_can_list_payments_with_no_filter(client, as_user, db: DbSession) -> None:
    admin = make_user(db, is_admin=True)
    target, _profile = make_user_and_profile(db)
    subscription = make_subscription(db, user_id=target.id)
    succeeded_payment = make_payment(
        db, user_id=target.id, subscription_id=subscription.id, status="succeeded"
    )
    failed_payment = make_payment(db, user_id=target.id, status="failed")
    as_user(admin)

    response = client.get("/admin/payments")

    assert response.status_code == 200
    body = response.json()
    ids = {row["id"] for row in body}
    assert ids == {str(succeeded_payment.id), str(failed_payment.id)}
    succeeded_row = next(row for row in body if row["id"] == str(succeeded_payment.id))
    assert succeeded_row["subscription_id"] == str(subscription.id)
    failed_row = next(row for row in body if row["id"] == str(failed_payment.id))
    assert failed_row["subscription_id"] is None


def test_admin_can_filter_payments_by_status(client, as_user, db: DbSession) -> None:
    admin = make_user(db, is_admin=True)
    target, _profile = make_user_and_profile(db)
    succeeded_payment = make_payment(db, user_id=target.id, status="succeeded")
    make_payment(db, user_id=target.id, status="refunded")
    as_user(admin)

    response = client.get("/admin/payments", params={"status": "succeeded"})

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["id"] == str(succeeded_payment.id)
    assert body[0]["status"] == "succeeded"


def test_admin_payments_empty_list_when_nothing_matches(client, as_user, db: DbSession) -> None:
    admin = make_user(db, is_admin=True)
    target, _profile = make_user_and_profile(db)
    make_payment(db, user_id=target.id, status="succeeded")
    as_user(admin)

    response = client.get("/admin/payments", params={"status": "failed"})

    assert response.status_code == 200
    assert response.json() == []


def test_admin_payments_invalid_status_is_400(client, as_user, db: DbSession) -> None:
    admin = make_user(db, is_admin=True)
    as_user(admin)

    response = client.get("/admin/payments", params={"status": "bogus"})

    assert response.status_code == 400


# --- POST /admin/payments/{id}/refund ---------------------------------------


def test_refund_with_linked_active_subscription_cancels_it(
    client, as_user, db: DbSession
) -> None:
    admin = make_user(db, is_admin=True)
    target, _profile = make_user_and_profile(db)
    subscription = make_subscription(db, user_id=target.id, status="active")
    payment = make_payment(
        db, user_id=target.id, subscription_id=subscription.id, status="succeeded"
    )
    as_user(admin)

    response = client.post(f"/admin/payments/{payment.id}/refund")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "refunded"

    db.expire_all()
    stored_payment = db.get(Payment, payment.id)
    stored_subscription = db.get(Subscription, subscription.id)
    assert stored_payment.status == "refunded"
    assert stored_subscription.status == "cancelled"


def test_refund_with_no_linked_subscription_is_noop_on_subscription_side(
    client, as_user, db: DbSession
) -> None:
    admin = make_user(db, is_admin=True)
    target, _profile = make_user_and_profile(db)
    payment = make_payment(db, user_id=target.id, subscription_id=None, status="succeeded")
    as_user(admin)

    response = client.post(f"/admin/payments/{payment.id}/refund")

    assert response.status_code == 200
    assert response.json()["status"] == "refunded"
    assert response.json()["subscription_id"] is None

    db.expire_all()
    assert db.get(Payment, payment.id).status == "refunded"


def test_refund_with_already_inactive_linked_subscription_leaves_it_unchanged(
    client, as_user, db: DbSession
) -> None:
    admin = make_user(db, is_admin=True)
    target, _profile = make_user_and_profile(db)
    subscription = make_subscription(db, user_id=target.id, status="expired")
    payment = make_payment(
        db, user_id=target.id, subscription_id=subscription.id, status="succeeded"
    )
    as_user(admin)

    response = client.post(f"/admin/payments/{payment.id}/refund")

    assert response.status_code == 200
    assert response.json()["status"] == "refunded"

    db.expire_all()
    # Already-expired subscription must stay exactly as it was -- refund
    # only ever moves "active" -> "cancelled", never touches any other
    # status, per plan.md's refund-target contract.
    assert db.get(Subscription, subscription.id).status == "expired"


def test_refund_already_cancelled_linked_subscription_leaves_it_unchanged(
    client, as_user, db: DbSession
) -> None:
    admin = make_user(db, is_admin=True)
    target, _profile = make_user_and_profile(db)
    subscription = make_subscription(db, user_id=target.id, status="cancelled")
    payment = make_payment(
        db, user_id=target.id, subscription_id=subscription.id, status="succeeded"
    )
    as_user(admin)

    response = client.post(f"/admin/payments/{payment.id}/refund")

    assert response.status_code == 200
    db.expire_all()
    assert db.get(Subscription, subscription.id).status == "cancelled"


def test_refund_uses_the_payments_own_subscription_not_users_other_subscriptions(
    client, as_user, db: DbSession
) -> None:
    """A user can have had multiple subscriptions over time -- the refund
    must only ever act on *this payment's own* `subscription_id`, never
    any other active subscription the same user happens to have.
    """
    admin = make_user(db, is_admin=True)
    target, _profile = make_user_and_profile(db)
    old_subscription = make_subscription(db, user_id=target.id, status="expired")
    current_subscription = make_subscription(db, user_id=target.id, status="active")
    payment = make_payment(
        db, user_id=target.id, subscription_id=old_subscription.id, status="succeeded"
    )
    as_user(admin)

    response = client.post(f"/admin/payments/{payment.id}/refund")

    assert response.status_code == 200
    db.expire_all()
    # The payment's own (already-expired) subscription stays expired...
    assert db.get(Subscription, old_subscription.id).status == "expired"
    # ...and the user's unrelated, currently-active subscription must NOT
    # be guessed at and cancelled.
    assert db.get(Subscription, current_subscription.id).status == "active"


def test_refund_nonexistent_payment_404s(client, as_user, db: DbSession) -> None:
    admin = make_user(db, is_admin=True)
    as_user(admin)

    response = client.post(f"/admin/payments/{uuid.uuid4()}/refund")

    assert response.status_code == 404


# --- Admin audit log ---------------------------------------------------------


def test_refund_creates_an_audit_log_entry(client, as_user, db: DbSession) -> None:
    admin = make_user(db, is_admin=True)
    target, _profile = make_user_and_profile(db)
    payment = make_payment(db, user_id=target.id, status="succeeded")
    as_user(admin)

    response = client.post(f"/admin/payments/{payment.id}/refund")
    assert response.status_code == 200

    db.expire_all()
    entries = db.query(AdminAuditLog).all()
    assert len(entries) == 1
    entry = entries[0]
    assert entry.admin_user_id == admin.id
    assert entry.action == "refund_payment"
    assert entry.target_type == "payment"
    assert entry.target_id == str(payment.id)
    assert entry.created_at is not None


def test_suspend_user_creates_an_audit_log_entry(client, as_user, db: DbSession) -> None:
    admin = make_user(db, is_admin=True)
    target = make_user(db, is_active=True)
    as_user(admin)

    response = client.post(f"/admin/users/{target.id}/suspend")
    assert response.status_code == 204

    db.expire_all()
    entries = db.query(AdminAuditLog).all()
    assert len(entries) == 1
    assert entries[0].action == "suspend_user"
    assert entries[0].admin_user_id == admin.id
    assert entries[0].target_id == str(target.id)


def test_resolve_report_creates_an_audit_log_entry(client, as_user, db: DbSession) -> None:
    admin = make_user(db, is_admin=True)
    _reported, reported_profile = make_user_and_profile(db)
    report = Report(
        reporter_profile_id=uuid.uuid4(),
        reported_profile_id=reported_profile.id,
        reason="spam",
        status="open",
    )
    db.add(report)
    db.commit()
    report_id = report.id
    as_user(admin)

    response = client.post(f"/admin/reports/{report_id}/resolve", json={"action": "banned"})
    assert response.status_code == 200

    db.expire_all()
    entries = db.query(AdminAuditLog).all()
    assert len(entries) == 1
    assert entries[0].action == "resolve_report"
    assert entries[0].admin_user_id == admin.id
    assert entries[0].target_id == str(report_id)


def test_review_verification_creates_an_audit_log_entry(client, as_user, db: DbSession) -> None:
    admin = make_user(db, is_admin=True)
    _target, profile = make_user_and_profile(db)
    verification = make_verification(db, profile_id=profile.id, status=STATUS_PENDING)
    as_user(admin)

    response = client.post(
        f"/admin/verifications/{verification.id}/review", json={"decision": "approve"}
    )
    assert response.status_code == 200

    db.expire_all()
    entries = db.query(AdminAuditLog).all()
    assert len(entries) == 1
    assert entries[0].action == "review_verification"
    assert entries[0].admin_user_id == admin.id
    assert entries[0].target_id == str(verification.id)


def test_audit_log_listing_endpoint_returns_newest_first(
    client, as_user, db: DbSession
) -> None:
    admin = make_user(db, is_admin=True)
    first_target = make_user(db, is_active=True)
    second_target = make_user(db, is_active=True)
    as_user(admin)

    first_response = client.post(f"/admin/users/{first_target.id}/suspend")
    second_response = client.post(f"/admin/users/{second_target.id}/suspend")
    assert first_response.status_code == 204
    assert second_response.status_code == 204

    response = client.get("/admin/audit-log")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 2
    # Newest first.
    assert body[0]["target_id"] == str(second_target.id)
    assert body[1]["target_id"] == str(first_target.id)
    for row in body:
        assert row["admin_user_id"] == str(admin.id)
        assert row["action"] == "suspend_user"
        assert "created_at" in row


def test_audit_log_listing_empty_when_nothing_recorded(client, as_user, db: DbSession) -> None:
    admin = make_user(db, is_admin=True)
    as_user(admin)

    response = client.get("/admin/audit-log")

    assert response.status_code == 200
    assert response.json() == []
