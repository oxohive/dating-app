# Ownership: 0012-wave3-engagement-and-lifecycle

Five concurrently-running subtasks, disjoint paths (same pattern as
0008/0010).

| Subtask | Owned paths | Do-not-touch |
|---|---|---|
| B7: push notifications infra | `services/backend/packages/api/features/notifications/**` (extends existing stub) | `core/`, `main.py`, `requirements.txt`, `db/migrations/`, every other feature dir — no trigger-wiring into other features this wave |
| B8: likes visibility + payment history/refund + audit log | `services/backend/packages/api/features/likes/**`, `services/backend/packages/api/features/subscriptions/**` (payment-history endpoint only), `services/backend/packages/api/features/admin/**` (refund endpoint + audit-log addition only) | `core/`, `main.py`, `requirements.txt`, `db/migrations/`, B7's `notifications/**`, every other feature dir |
| B9: marketing website content | `apps/marketing-site/**` | backend, mobile, admin-web |
| M4: mobile push notifications + incoming likes | `apps/mobile/src/features/notifications/**` (new), `apps/mobile/src/features/likes/**` (additive) | `core/`, `components/` (additions only), backend, admin-web, marketing-site |
| W3: admin-web audit logs + refund UI | `apps/admin-web/src/features/audit/**` (new), `apps/admin-web/src/features/payments/**` (additive: refund button only) | `components/` (additions only), backend, mobile, marketing-site — analytics dropped from this wave, do not build an `analytics/**` dir |

## Notes

- Same cross-feature-model-import rule as every prior wave: import,
  never redefine.
- `has_active_premium(db, user_id)` — two-argument signature, confirmed
  in Wave 2 — gates "see who liked you"'s full-detail branch.
- `db/migrations/env.py` and `db/migrations/versions/` are integration-
  step-only, same as every prior wave — must add `notifications` model
  imports (for `push_tokens`/`notification_preferences`) and whatever
  B8's audit-log table is called.
- Notification-trigger wiring is integration-step-only for three events
  only: `new_like`, `new_match`, plus the new
  `verification_result`/`subscription_activated` events. `new_message`
  is **already wired** (Wave 1, `messaging/message_service.py` calls
  `notification_service.notify_new_message`) — B7 upgrades that
  function's internals in place; integration does not need to add this
  call site.
- A validator agent reviewed `plan.md` before dispatch (this pass) — see
  `plan.md`'s "Validation step" section for findings and fixes applied,
  including the corrected `notifications/` state, narrowed marketing-site
  scope, the refund-target fix, and dropping analytics from this wave.
