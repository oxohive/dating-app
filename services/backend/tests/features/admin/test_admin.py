"""Real tests for the admin feature: require_admin gating, user search,
suspend, and report list/resolve.
"""
from __future__ import annotations

import uuid

from sqlalchemy.orm import Session as DbSession

from packages.api.features.admin import admin_service
from packages.api.features.auth.models import User
from packages.api.features.safety.models import Report

from .conftest import make_user, make_user_and_profile


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
