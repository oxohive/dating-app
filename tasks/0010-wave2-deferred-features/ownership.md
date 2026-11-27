# Ownership: 0010-wave2-deferred-features

Five concurrently-running subtasks, disjoint paths (same pattern as 0008).

| Subtask | Owned paths | Do-not-touch |
|---|---|---|
| B4: subscriptions/payments | `services/backend/packages/api/features/subscriptions/**`, matching tests | `core/`, `main.py`, `requirements.txt`, `db/migrations/`, other feature dirs |
| B5: GPS discovery + compatibility | `services/backend/packages/api/features/{discovery,location}/**` (extending existing files), matching tests | same as above, plus B4/B6's dirs |
| B6: verification | `services/backend/packages/api/features/verification/**` (new), `features/admin/**` (review queue addition only), matching tests | same as above, plus B4/B5's dirs |
| M3: mobile Premium/GPS/verification screens | `apps/mobile/src/features/{subscriptions,verification}/**` (new), additive changes to `discovery`/`profile` for GPS radius picker | `core/`, `components/` (additions only), backend, admin-web |
| W2: admin-web verification + payments monitoring | `apps/admin-web/src/features/{verification,payments}/**` (new) | `components/` (additions only), backend, mobile |

## Notes

- Same cross-feature-model-import rule as 0008: import, never redefine.
- `has_active_premium(user_id)` (B4) is the one entitlement check every
  Premium-gated endpoint in B5/B6 must call — built once, imported
  everywhere. Premium-gated this wave: GPS discovery read+write, radius
  filtering/ranking, and the compatibility-insights breakdown — all three.
- B5's GPS work means adding a **new `UserLocation` ORM class** to
  `features/location/models.py` (currently an empty stub) — this is
  squarely inside B5's owned paths, not a `profiles/**` change; no
  subtask owns `features/profiles/**` this wave, so nothing may edit it.
- `db/migrations/env.py` and `db/migrations/versions/` are **not** owned
  by any of the five parallel subtasks — same as task 0008, they're
  integration-step-only, touched after all five land, to avoid merge
  collisions on the one shared migration file. The integration step must
  add model imports for `location`, `subscriptions`, and `verifications`
  to `env.py` before running `alembic revision --autogenerate` (see
  `plan.md`'s validator finding #5).
- A validator agent reviewed `plan.md` before dispatch (this pass) — see
  `plan.md`'s "Validation step" section for findings and fixes applied.
