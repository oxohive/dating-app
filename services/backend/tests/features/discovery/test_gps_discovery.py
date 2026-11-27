"""Tests for GPS-based nearby discovery (tasks/0010-wave2-deferred-features):

- the fixed radius enum (valid tiers accepted, anything else rejected)
- Premium gating (both the 403-without-premium and the behavior with it)
- radius filtering / nearest-first ordering actually works end to end
- no response ever leaks another profile's raw latitude/longitude
"""
from __future__ import annotations

from packages.api.features.location.location_service import haversine_km

MUMBAI = (19.0760, 72.8777)


def _offset_point(base: tuple[float, float], delta_lat_deg: float) -> tuple[float, float]:
    """A point `delta_lat_deg` of latitude north of `base`, same longitude --
    keeps the math simple/predictable (no east-west component)."""
    lat, lon = base
    return (lat + delta_lat_deg, lon)


def test_radius_enum_rejects_invalid_value(client, as_profile, make_profile, make_premium) -> None:
    me = make_profile(city="Mumbai")
    make_premium(me)
    as_profile(me)

    response = client.get("/discovery/feed?radius_km=15")

    assert response.status_code == 422


def test_radius_enum_rejects_non_numeric_garbage(
    client, as_profile, make_profile, make_premium
) -> None:
    me = make_profile(city="Mumbai")
    make_premium(me)
    as_profile(me)

    response = client.get("/discovery/feed?radius_km=not-a-number")

    assert response.status_code == 422


def test_radius_enum_accepts_every_valid_tier(
    client, as_profile, make_profile, make_premium, make_location
) -> None:
    me = make_profile(city="Mumbai")
    make_premium(me)
    make_location(me, *MUMBAI)
    as_profile(me)

    for tier in ("1", "3", "5", "10", "25", "50", "100", "any"):
        response = client.get(f"/discovery/feed?radius_km={tier}")
        assert response.status_code == 200, f"tier {tier!r} should be accepted"


def test_gps_feed_requires_premium(client, as_profile, make_profile) -> None:
    me = make_profile(city="Mumbai")
    as_profile(me)  # no make_premium() call -- free user

    response = client.get("/discovery/feed?radius_km=5")

    assert response.status_code == 403


def test_gps_feed_requires_location_set(client, as_profile, make_profile, make_premium) -> None:
    me = make_profile(city="Mumbai")
    make_premium(me)
    as_profile(me)  # premium, but never called PUT /location/me

    response = client.get("/discovery/feed?radius_km=5")

    assert response.status_code == 400


def test_gps_feed_without_radius_param_is_unaffected_free_behavior(
    client, as_profile, make_profile
) -> None:
    """Omitting `radius_km` entirely must keep working exactly as the
    pre-existing free, same-city feed -- GPS discovery is additive."""
    me = make_profile(city="Mumbai")
    candidate = make_profile(city="Mumbai")
    as_profile(me)

    response = client.get("/discovery/feed")

    assert response.status_code == 200
    body = response.json()
    assert str(candidate.id) in {p["id"] for p in body["profiles"]}
    # Free users: no compatibility breakdown.
    assert all(p["compatibility"] is None for p in body["profiles"])


def test_gps_feed_filters_out_candidates_beyond_radius(
    client, as_profile, make_profile, make_premium, make_location
) -> None:
    me = make_profile(city="Mumbai")
    make_premium(me)
    make_location(me, *MUMBAI)

    near = make_profile(city="Mumbai")
    make_location(near, *_offset_point(MUMBAI, 0.01))  # ~1.1km away

    far = make_profile(city="Mumbai")
    make_location(far, *_offset_point(MUMBAI, 2.0))  # ~222km away

    actual_near_km = haversine_km(*MUMBAI, *_offset_point(MUMBAI, 0.01))
    actual_far_km = haversine_km(*MUMBAI, *_offset_point(MUMBAI, 2.0))
    assert actual_near_km < 5 < actual_far_km  # sanity-check the fixture geometry

    as_profile(me)
    response = client.get("/discovery/feed?radius_km=5")

    assert response.status_code == 200
    returned_ids = {p["id"] for p in response.json()["profiles"]}
    assert str(near.id) in returned_ids
    assert str(far.id) not in returned_ids


def test_gps_feed_any_radius_includes_everyone_with_a_location(
    client, as_profile, make_profile, make_premium, make_location
) -> None:
    me = make_profile(city="Mumbai")
    make_premium(me)
    make_location(me, *MUMBAI)

    far = make_profile(city="Mumbai")
    make_location(far, *_offset_point(MUMBAI, 2.0))  # ~222km away -- beyond every fixed tier

    no_location = make_profile(city="Mumbai")  # never calls make_location

    as_profile(me)
    response = client.get("/discovery/feed?radius_km=any")

    assert response.status_code == 200
    returned_ids = {p["id"] for p in response.json()["profiles"]}
    assert str(far.id) in returned_ids
    assert str(no_location.id) not in returned_ids  # no location at all -> never a GPS candidate


def test_gps_feed_orders_nearest_first(
    client, as_profile, make_profile, make_premium, make_location
) -> None:
    me = make_profile(city="Mumbai")
    make_premium(me)
    make_location(me, *MUMBAI)

    far = make_profile(city="Mumbai")
    make_location(far, *_offset_point(MUMBAI, 0.3))  # ~33km

    near = make_profile(city="Mumbai")
    make_location(near, *_offset_point(MUMBAI, 0.02))  # ~2.2km

    as_profile(me)
    response = client.get("/discovery/feed?radius_km=any")

    ids_in_order = [p["id"] for p in response.json()["profiles"]]
    assert ids_in_order.index(str(near.id)) < ids_in_order.index(str(far.id))


def test_gps_feed_includes_distance_band_not_raw_distance(
    client, as_profile, make_profile, make_premium, make_location
) -> None:
    me = make_profile(city="Mumbai")
    make_premium(me)
    make_location(me, *MUMBAI)

    near = make_profile(city="Mumbai")
    make_location(near, *_offset_point(MUMBAI, 0.02))  # ~2.2km -> "1-3km" band

    as_profile(me)
    response = client.get("/discovery/feed?radius_km=any")

    item = next(p for p in response.json()["profiles"] if p["id"] == str(near.id))
    assert item["distance_band"] == "1-3km"


def test_no_response_ever_leaks_raw_coordinates(
    client, as_profile, make_profile, make_premium, make_location
) -> None:
    """Hard privacy requirement (plan.md): no API response may ever
    include another profile's raw latitude/longitude -- only the banded
    label. Checked across every discovery surface this subtask owns."""
    me = make_profile(city="Mumbai")
    make_premium(me)
    make_location(me, *MUMBAI)

    other = make_profile(city="Mumbai")
    make_location(other, *_offset_point(MUMBAI, 0.02))

    as_profile(me)

    for url in (
        "/discovery/feed",
        "/discovery/feed?radius_km=any",
        "/discovery/feed?radius_km=10",
        f"/discovery/profiles/{other.id}/compatibility",
    ):
        response = client.get(url)
        assert response.status_code == 200, url
        body_text = response.text
        assert "latitude" not in body_text, f"{url} leaked a latitude field"
        assert "longitude" not in body_text, f"{url} leaked a longitude field"
