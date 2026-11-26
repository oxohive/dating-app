"""Onboarding ORM models.

Deviation from the original scaffold stub (which named a future
`OnboardingProgress` model): the plan's shared schema does not define any
table owned by `onboarding` — `POST /onboarding/profile` creates a row in
`profiles` (owned by the `profiles` feature, see
`packages.api.features.profiles.models.Profile`). Onboarding is a one-shot
action with no persisted in-progress state this wave, so this module
intentionally defines no ORM classes.
"""
from __future__ import annotations
