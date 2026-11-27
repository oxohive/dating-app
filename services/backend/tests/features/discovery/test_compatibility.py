"""Tests for compatibility insights (tasks/0010-wave2-deferred-features item 4):

- Premium gating (free users get no breakdown and 403 on the standalone
  endpoint; Premium users get it)
- the pre-existing free fields (interests/relationship_intention) are
  never removed or gated
- compatibility score logic against concrete, constructed input
  combinations
"""
from __future__ import annotations

from packages.api.features.discovery.compatibility_service import compute_compatibility


def test_free_user_feed_keeps_existing_free_fields_but_no_breakdown(
    client, as_profile, make_profile
) -> None:
    me = make_profile(city="Mumbai", interests=["hiking"])
    make_profile(city="Mumbai", interests=["hiking", "coffee"])
    as_profile(me)

    response = client.get("/discovery/feed")

    assert response.status_code == 200
    item = response.json()["profiles"][0]
    assert "interests" in item
    assert "relationship_intention" in item
    assert item["compatibility"] is None


def test_premium_user_feed_includes_breakdown(
    client, as_profile, make_profile, make_premium
) -> None:
    me = make_profile(city="Mumbai", interests=["hiking"])
    make_premium(me)
    make_profile(city="Mumbai", interests=["hiking", "coffee"])
    as_profile(me)

    response = client.get("/discovery/feed")

    assert response.status_code == 200
    item = response.json()["profiles"][0]
    assert item["compatibility"] is not None
    assert "overall_score" in item["compatibility"]
    assert "overall_label" in item["compatibility"]
    assert "factors" in item["compatibility"]
    assert "disclaimer" in item["compatibility"]


def test_compatibility_disclaimer_is_not_framed_as_scientifically_proven(
    client, as_profile, make_profile, make_premium
) -> None:
    me = make_profile(city="Mumbai")
    make_premium(me)
    make_profile(city="Mumbai")
    as_profile(me)

    response = client.get("/discovery/feed")
    disclaimer = response.json()["profiles"][0]["compatibility"]["disclaimer"].lower()

    assert "not" in disclaimer
    assert "scientif" in disclaimer


def test_standalone_compatibility_endpoint_requires_premium(
    client, as_profile, make_profile
) -> None:
    me = make_profile(city="Mumbai")
    other = make_profile(city="Mumbai")
    as_profile(me)

    response = client.get(f"/discovery/profiles/{other.id}/compatibility")

    assert response.status_code == 403


def test_standalone_compatibility_endpoint_works_for_premium(
    client, as_profile, make_profile, make_premium
) -> None:
    me = make_profile(city="Mumbai")
    make_premium(me)
    other = make_profile(city="Mumbai")
    as_profile(me)

    response = client.get(f"/discovery/profiles/{other.id}/compatibility")

    assert response.status_code == 200
    body = response.json()
    assert "overall_score" in body
    assert "factors" in body


def test_compute_compatibility_high_score_for_strong_match() -> None:
    breakdown = compute_compatibility(
        intention_a="serious",
        intention_b="serious",
        interests_a=["hiking", "coffee", "music"],
        interests_b=["hiking", "coffee", "music"],
        distance_km=0.5,
    )

    assert breakdown.overall_score >= 0.75
    assert breakdown.overall_label == "Strong potential match"
    factor_names = {f.name: f for f in breakdown.factors}
    assert factor_names["relationship_intention"].match is True
    assert factor_names["shared_interests"].match is True
    assert factor_names["proximity"].score > 0


def test_compute_compatibility_low_score_for_mismatch() -> None:
    breakdown = compute_compatibility(
        intention_a="serious",
        intention_b="casual",
        interests_a=["hiking"],
        interests_b=["gaming"],
        distance_km=150.0,
    )

    assert breakdown.overall_score < 0.25
    factor_names = {f.name: f for f in breakdown.factors}
    assert factor_names["relationship_intention"].match is False
    assert factor_names["shared_interests"].match is False
    assert factor_names["proximity"].score == 0.0


def test_compute_compatibility_handles_missing_location_gracefully() -> None:
    breakdown = compute_compatibility(
        intention_a="serious",
        intention_b="serious",
        interests_a=["hiking"],
        interests_b=["hiking"],
        distance_km=None,
    )

    factor_names = {f.name: f for f in breakdown.factors}
    assert factor_names["proximity"].match is None
    assert factor_names["proximity"].score == 0.0
    assert "not available" in factor_names["proximity"].note.lower()


def test_compute_compatibility_partial_interest_overlap_scores_between_extremes() -> None:
    full_overlap = compute_compatibility(
        intention_a="serious",
        intention_b="serious",
        interests_a=["hiking", "coffee"],
        interests_b=["hiking", "coffee"],
        distance_km=0.5,
    )
    partial_overlap = compute_compatibility(
        intention_a="serious",
        intention_b="serious",
        interests_a=["hiking", "coffee"],
        interests_b=["hiking", "gaming"],
        distance_km=0.5,
    )

    assert partial_overlap.overall_score < full_overlap.overall_score
