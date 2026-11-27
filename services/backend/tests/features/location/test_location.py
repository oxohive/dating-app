"""Tests for the location feature (tasks/0010-wave2-deferred-features item 2):

- distance-banding correctness at every boundary
- radius enum -> float conversion
- Premium gating on the GPS write/read endpoints
- upsert semantics (one row per profile)
"""
from __future__ import annotations

import pytest

from packages.api.features.location.location_service import (
    distance_band,
    get_location,
    haversine_km,
    radius_km_value,
    upsert_location,
)


@pytest.mark.parametrize(
    "distance_km,expected_band",
    [
        (0.0, "<1km"),
        (0.5, "<1km"),
        (0.999, "<1km"),
        (1.0, "1-3km"),
        (2.0, "1-3km"),
        (2.999, "1-3km"),
        (3.0, "3-5km"),
        (4.999, "3-5km"),
        (5.0, "5-10km"),
        (9.999, "5-10km"),
        (10.0, "10-25km"),
        (24.999, "10-25km"),
        (25.0, "25-50km"),
        (49.999, "25-50km"),
        (50.0, "50-100km"),
        (99.999, "50-100km"),
        (100.0, "100km+"),
        (1000.0, "100km+"),
    ],
)
def test_distance_band_boundaries(distance_km: float, expected_band: str) -> None:
    assert distance_band(distance_km) == expected_band


def test_distance_band_rejects_negative_distance() -> None:
    with pytest.raises(ValueError):
        distance_band(-1.0)


@pytest.mark.parametrize(
    "radius,expected",
    [(1, 1.0), (3, 3.0), (5, 5.0), (10, 10.0), (25, 25.0), (50, 50.0), (100, 100.0), ("any", None)],
)
def test_radius_km_value(radius, expected) -> None:
    assert radius_km_value(radius) == expected


def test_haversine_same_point_is_zero() -> None:
    assert haversine_km(19.0760, 72.8777, 19.0760, 72.8777) == pytest.approx(0.0, abs=1e-6)


def test_haversine_known_distance_is_approximately_correct() -> None:
    # ~1 degree of latitude is ~111.19km at the equator-ish latitudes used
    # here; moving purely north keeps the math simple to sanity-check.
    distance = haversine_km(19.0, 72.8777, 20.0, 72.8777)
    assert 110 < distance < 112


def test_upsert_location_creates_then_updates_single_row(db, make_profile) -> None:
    profile = make_profile()

    first = upsert_location(db, profile.id, 19.0760, 72.8777)
    assert first.latitude == pytest.approx(19.0760)

    second = upsert_location(db, profile.id, 20.0, 73.0)
    assert second.id == first.id  # same row, updated in place
    assert second.latitude == pytest.approx(20.0)

    fetched = get_location(db, profile.id)
    assert fetched is not None
    assert fetched.longitude == pytest.approx(73.0)


def test_get_location_returns_none_when_never_set(db, make_profile) -> None:
    profile = make_profile()
    assert get_location(db, profile.id) is None


def test_put_location_requires_premium(client, as_profile, make_profile) -> None:
    me = make_profile()
    as_profile(me)

    response = client.put("/location/me", json={"latitude": 19.0760, "longitude": 72.8777})

    assert response.status_code == 403


def test_put_location_succeeds_for_premium_user(
    client, as_profile, make_profile, make_premium
) -> None:
    me = make_profile()
    make_premium(me)
    as_profile(me)

    response = client.put("/location/me", json={"latitude": 19.0760, "longitude": 72.8777})

    assert response.status_code == 200
    body = response.json()
    assert body["latitude"] == pytest.approx(19.0760)
    assert body["longitude"] == pytest.approx(72.8777)
    assert body["profile_id"] == str(me.id)


def test_get_location_requires_premium(client, as_profile, make_profile) -> None:
    me = make_profile()
    as_profile(me)

    response = client.get("/location/me")

    assert response.status_code == 403


def test_get_location_404_when_not_set_for_premium_user(
    client, as_profile, make_profile, make_premium
) -> None:
    me = make_profile()
    make_premium(me)
    as_profile(me)

    response = client.get("/location/me")

    assert response.status_code == 404


def test_put_location_rejects_out_of_range_coordinates(
    client, as_profile, make_profile, make_premium
) -> None:
    me = make_profile()
    make_premium(me)
    as_profile(me)

    response = client.put("/location/me", json={"latitude": 999.0, "longitude": 72.8777})

    assert response.status_code == 422
