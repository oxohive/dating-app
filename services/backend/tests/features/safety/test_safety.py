"""Real tests for the safety feature: block idempotency/self-block rejection,
report creation, and 404s for nonexistent targets.
"""
from __future__ import annotations

import uuid

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session as DbSession

from packages.api.features.safety import block_service, report_service
from packages.api.features.safety.models import Block, Report

from .conftest import make_user_and_profile


def test_create_block_is_idempotent(db: DbSession) -> None:
    a = make_user_and_profile(db)
    b = make_user_and_profile(db)

    first = block_service.create_block(db, a.id, b.id)
    second = block_service.create_block(db, a.id, b.id)

    assert first.id == second.id
    rows = db.query(Block).filter_by(blocker_profile_id=a.id, blocked_profile_id=b.id).all()
    assert len(rows) == 1


def test_create_block_rejects_self_block(db: DbSession) -> None:
    a = make_user_and_profile(db)
    with pytest.raises(HTTPException) as exc_info:
        block_service.create_block(db, a.id, a.id)
    assert exc_info.value.status_code == 400


def test_create_block_404_for_unknown_target(db: DbSession) -> None:
    a = make_user_and_profile(db)
    with pytest.raises(HTTPException) as exc_info:
        block_service.create_block(db, a.id, uuid.uuid4())
    assert exc_info.value.status_code == 404


def test_block_is_directional(db: DbSession) -> None:
    a = make_user_and_profile(db)
    b = make_user_and_profile(db)
    block_service.create_block(db, a.id, b.id)

    # b has not blocked a, only a blocked b
    reverse = (
        db.query(Block).filter_by(blocker_profile_id=b.id, blocked_profile_id=a.id).first()
    )
    assert reverse is None


def test_create_report(db: DbSession) -> None:
    a = make_user_and_profile(db)
    b = make_user_and_profile(db)

    report = report_service.create_report(db, a.id, b.id, "harassment", "details here")

    assert report.status == "open"
    assert db.get(Report, report.id) is not None


def test_create_report_rejects_self_report(db: DbSession) -> None:
    a = make_user_and_profile(db)
    with pytest.raises(HTTPException) as exc_info:
        report_service.create_report(db, a.id, a.id, "spam", None)
    assert exc_info.value.status_code == 400


def test_create_report_404_for_unknown_target(db: DbSession) -> None:
    a = make_user_and_profile(db)
    with pytest.raises(HTTPException) as exc_info:
        report_service.create_report(db, a.id, uuid.uuid4(), "spam", None)
    assert exc_info.value.status_code == 404


# --- endpoint-level tests -------------------------------------------------


def test_blocks_endpoint_returns_204(client, as_profile, db: DbSession) -> None:
    a = make_user_and_profile(db)
    b = make_user_and_profile(db)
    as_profile(a)

    response = client.post("/blocks", json={"profile_id": str(b.id)})

    assert response.status_code == 204
    assert response.content == b""


def test_blocks_endpoint_is_idempotent(client, as_profile, db: DbSession) -> None:
    a = make_user_and_profile(db)
    b = make_user_and_profile(db)
    as_profile(a)

    first = client.post("/blocks", json={"profile_id": str(b.id)})
    second = client.post("/blocks", json={"profile_id": str(b.id)})

    assert first.status_code == 204
    assert second.status_code == 204
    assert db.query(Block).count() == 1


def test_reports_endpoint_returns_201(client, as_profile, db: DbSession) -> None:
    a = make_user_and_profile(db)
    b = make_user_and_profile(db)
    as_profile(a)

    response = client.post(
        "/reports",
        json={"profile_id": str(b.id), "reason": "fake_profile", "details": "looks fake"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "open"
    assert body["reporter_profile_id"] == str(a.id)
    assert body["reported_profile_id"] == str(b.id)
