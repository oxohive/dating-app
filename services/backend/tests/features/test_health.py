"""Smoke test for the /health endpoint.

Real, working test (not a stub) — this is what CI runs to confirm the app
boots and the correlation ID plumbing works end to end.
"""
from __future__ import annotations

from fastapi.testclient import TestClient

from packages.api.main import app


def test_health_returns_ok_with_correlation_id() -> None:
    client = TestClient(app)
    response = client.get("/health")

    assert response.status_code == 200

    body = response.json()
    assert body["status"] == "ok"
    assert body["correlation_id"]

    assert response.headers.get("X-Correlation-ID") == body["correlation_id"]


def test_health_echoes_incoming_correlation_id() -> None:
    client = TestClient(app)
    response = client.get("/health", headers={"X-Correlation-ID": "test-fixed-id"})

    assert response.status_code == 200
    assert response.headers["X-Correlation-ID"] == "test-fixed-id"
    assert response.json()["correlation_id"] == "test-fixed-id"
