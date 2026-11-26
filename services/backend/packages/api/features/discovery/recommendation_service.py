"""Recommendation service: ranking/scoring of discovery candidates.

Builds the SQL "completeness" score used to order the discovery feed (more
complete profiles surface first, then most recent -- see
discovery_service.get_feed). Takes the `Profile` ORM class in as a
parameter rather than importing it directly, so this module has no
import-time dependency on the profiles feature (owned by subtask B1) and
stays independently unit-testable with any class exposing the same two
columns.
"""
from __future__ import annotations

from sqlalchemy import case
from sqlalchemy.sql.elements import ColumnElement


def completeness_score_expression(
    profile_cls, photo_count_subquery: ColumnElement | None = None
) -> ColumnElement:
    """Return a SQL integer expression scoring how "complete" a profile is.

    Awards one point each for: a non-null bio, non-null interests, and (if
    a photo-count subquery is supplied) having at least one photo. This is
    a simple, documented heuristic for this wave -- not a compatibility or
    quality score.
    """
    score = case((profile_cls.bio.isnot(None), 1), else_=0) + case(
        (profile_cls.interests.isnot(None), 1), else_=0
    )
    if photo_count_subquery is not None:
        score = score + case((photo_count_subquery > 0, 1), else_=0)
    return score
