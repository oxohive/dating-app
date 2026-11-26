# Ownership: 0008-mvp-feature-completion

Six concurrently-running subtasks, disjoint paths.

| Subtask | Owned paths | Do-not-touch |
|---|---|---|
| B1: auth/onboarding/profiles/location | `services/backend/packages/api/features/{auth,onboarding,profiles,location}/**`, `services/backend/tests/features/{auth,onboarding,profiles,location}/**` | everything else, incl. `core/`, `main.py`, `requirements.txt`, `db/migrations/` |
| B2: discovery/likes/matches | `services/backend/packages/api/features/{discovery,likes,matches}/**`, matching `tests/features/**` | same as above, plus B1/B3's feature dirs |
| B3: messaging/safety/notifications/admin | `services/backend/packages/api/features/{messaging,safety,notifications,admin}/**`, matching `tests/features/**` | same as above, plus B1/B2's feature dirs |
| M1: mobile auth/onboarding/profile | `apps/mobile/src/features/{auth,onboarding,profile}/**` | `apps/mobile/src/core/**`, `apps/mobile/src/components/**` (existing files — additions only if unavoidable), M2's feature dirs, admin-web, backend |
| M2: mobile discovery/likes/matches/messaging/safety | `apps/mobile/src/features/{discovery,likes,matches,messaging,safety}/**` | same restriction as M1, plus M1's feature dirs |
| W1: admin-web users/reports/moderation | `apps/admin-web/src/features/{users,reports,moderation}/**` | `apps/admin-web/src/components/**` (additions only), backend, mobile |

## Notes

- `core/database.py`, `core/correlation_id.py`, `core/logging.py`,
  `core/tracing.py`, `core/config.py`, `main.py`, `requirements.txt`,
  `db/migrations/**` are explicitly NOT touched by any of the six — those
  are the integration step's concern, after all six land.
- B2 reads the `blocks` table (owned/created by B3) for discovery
  filtering — this works without B2 editing B3's files because both
  subtasks are given the identical schema in `plan.md`.
- A validator agent reviews `plan.md` before any of the six are dispatched.
