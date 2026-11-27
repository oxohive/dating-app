# Status: 0012-wave3-engagement-and-lifecycle

**State:** verifying (every reconciliation item fixed and independently
re-verified; committed and pushed to `main`)

## Definition-of-done checklist

- [x] Plan validated by an independent agent — found and fixed 5 real
      gaps: `notifications/` was not an empty stub (upgrade in place,
      not parallel functions; `new_message` already wired since Wave
      1), marketing-site already has home/pricing/FAQ (scope narrowed
      to genuinely missing pages), refund target was ambiguous (fixed
      via `Payment.subscription_id`), analytics had no backend so
      dropped from scope, audit-log absence confirmed definitively.
      See `plan.md`'s "Validation step" section.
- [x] B7 (push notifications infra) implemented, tested
- [x] B8 (likes visibility + payment history/refund + audit log)
      implemented, tested
- [x] B9 (marketing website content) implemented, tested
- [x] M4 (mobile push notifications + incoming likes) implemented, tested
- [x] W3 (admin-web audit logs + refund UI; analytics dropped from scope)
      implemented, tested
- [x] Integration: notification-trigger wiring into likes/matches/
      verification/subscriptions, `notifications_router` mounted,
      `firebase-admin==7.8.0` in `requirements.txt`, mobile/admin-web
      client contracts reconciled, push-token unregister wired into
      logout, Settings entry point to preferences screen, migration
      generated and verified, full test suites green
- [x] Committed and pushed to `main`
- [ ] Deploy verification — **blocked until the task-0008 DB-migration
      human-approval step is resolved** (pilot DB schema, including
      this wave's three new tables, still does not exist on the live
      instance); code-level work does not wait on this, but live
      verification does. Same pre-existing blocker documented in
      `tasks/0008-mvp-feature-completion/status.md`, not reopened or
      re-attempted here (explicitly out of scope — this wave's
      migration was verified only against a local throwaway Postgres,
      never against the real pilot DB).
- [ ] Next wave planned immediately after

## Audit of the interrupted agent's work — what was found already done

A previous background agent ran all five parallel subtasks and began
integrating, then its session process ended mid-task. Nothing was lost
or reverted; the working tree held real, uncommitted work. Rather than
redo anything, I audited the actual landed code against the punch list
in `status.md` (not trusting its own claims) before touching anything:

- `notifications_router` **was already mounted** in `main.py`
  (`/notifications` prefix) — done.
- `firebase-admin==7.8.0` **was already** in `requirements.txt`, and
  confirmed actually installed correctly in the shared `.venv`
  (`import firebase_admin; firebase_admin.__version__ == "7.8.0"`) — no
  reinstall needed.
- `notify_verification_result`/`notify_subscription_activated`
  **already existed** in `notification_service.py`, upgraded in place
  alongside `notify_new_like`/`notify_new_match`/`notify_new_message`,
  following the same pattern (resolve to `user_id`, check preferences,
  send via every registered token) — B7's work here was complete and
  correct, just not yet wired to any call site.
- The FCM `data` payload (`{"type": event_type, ...}`) **was already**
  being attached in `_send_to_user` — done, matches
  `notificationNavigation.ts`'s expected `data.type`/
  `data.conversation_id` fields exactly.
- Mobile's `notifications.api.ts` **was already** correctly reconciled
  against the real backend: `PUT /notifications/preferences` (not
  PATCH), matching `routes.py` exactly. No mobile reconciliation work
  needed here — a prior pass (visible in the file's own comments) had
  already done this.
- Mobile's `likes.api.ts`'s `mapIncomingLikesResponse` **was already**
  correctly reconciled against the real `IncomingLikesResponse` shape
  (`is_premium`/`count`/`likes`, each `likes[].profile.{id,
  display_name, photo_url}` + `liked_at`) — exact match, no changes
  needed.
- Push-token unregister **was already** wired into
  `useLogout.ts` (calls `unregisterPushToken` with the
  last-registered token before clearing session) — done.
- `ProfileScreen.tsx` **already** had a "Notification preferences"
  button navigating to the `NotificationPreferences` route, and
  `RootNavigator.tsx` **already** registered that route pointing at
  `NotificationPreferencesScreen` — done.
- Admin-web's `audit.api.ts` and `payments.api.ts` **were already**
  verified field-for-field against `AdminAuditLogOut`/`PaymentAdminOut`
  — exact match (their own code comments document this), no changes
  needed.

So the interrupted agent had actually finished every client-side
(mobile + admin-web) reconciliation item and every B7-owned
notification-service upgrade correctly — the parts of the punch list
still genuinely open were exactly the backend trigger-wiring and the
schema/migration items below, which only an integrator (not any single
subtask) could do without crossing owned-path boundaries.

## What I completed myself

### 1. Notification trigger wiring (the one item every subtask correctly deferred to integration)

- `services/backend/packages/api/features/likes/like_service.py`:
  `create_like` now calls `notification_service.notify_new_like`
  (recipient, on a non-mutual like) or
  `notification_service.notify_new_match` (**both** matched profiles,
  on a mutual like) right after the existing `db.commit()`. A mutual
  like notifies both sides about the match instead of also sending a
  redundant "new like" to the recipient. Wrapped in its own
  defensive `try/except` (on top of `notification_service`'s own
  internal defenses) so a notification-layer regression can never
  affect the like/match response already computed. The idempotent
  repeat-like path does not re-notify.
- `services/backend/packages/api/features/admin/admin_service.py`:
  `review_verification` now calls `notification_service.
  notify_verification_result(verification.profile_id, decision ==
  "approve", db=db)` right after `db.commit()`/`db.refresh()`, same
  defensive wrapping.
- `services/backend/packages/api/features/subscriptions/
  subscriptions_service.py`: `process_razorpay_webhook`'s
  `payment.captured` success path now calls
  `notification_service.notify_subscription_activated(user_id, plan,
  db=db)` after its own `db.commit()`. Since
  `POST /subscriptions/checkout-session/{id}/sandbox-complete` reuses
  this exact function for its success path, this one call site covers
  both the real webhook and the sandbox-complete endpoint, per the
  plan's instruction.
- No circular imports: `notification_service.py` only imports from
  `messaging.models`/`profiles.models`, so `likes`/`admin`/
  `subscriptions` importing it introduces no cycle (confirmed by
  running the full test suite, not just by inspection).

### 2. Pre-existing test/lint bugs fixed (found while running the full suite, unrelated to the wiring above but blocking a green suite)

- `tests/features/notifications/test_notification_service.py`'s
  `_FakeFcmClient.send()` was stale from before B7 added the `data`
  payload parameter to the real `FcmClient.send()` — it only accepted
  3 positional args, so every test exercising a real send path
  (`notify_new_like`/`notify_new_match`/`notify_new_message` with a
  registered token) failed with a `TypeError`. Fixed the fake's
  signature to accept `data: dict[str, str] | None = None` and record
  it, updated the one place a test destructured `.calls[0]` as a
  3-tuple to a 4-tuple. This was a B7-introduced bug exposed by, not
  caused by, the trigger-wiring above — 7 tests were failing before
  this fix, all notification-service tests, none of my new call
  sites' own tests.
- `ruff check .` found two pre-existing issues unrelated to anything I
  wrote (import ordering in `likes/routes.py`, one line-too-long in
  `notification_service.py`) — fixed both (one via `ruff --fix`, the
  other by manual reflow) since "all tests must be green" naturally
  extends to the lint gate this repo also runs.
- Mobile's `likes.api.ts` had one pre-existing ESLint warning
  (`Array<T>` vs `T[]`) — fixed via `eslint --fix`.

### 3. Standard integration duties

- `services/backend/db/migrations/env.py`: added model imports for
  `admin` (`AdminAuditLog`) and `notifications` (`PushToken`,
  `NotificationPreference`) — both were missing, confirmed by reading
  the file before editing.
- Generated `35a09b071ce5_wave_3_notifications_admin_audit_log.py` via
  `alembic revision --autogenerate` against a throwaway
  `postgis/postgis:16-3.4` Docker container (same image/method as
  tasks 0008/0010's own migrations — Docker Desktop wasn't running at
  task start; started it directly since no local Postgres install had
  the `postgis` extension available). Autogenerate picked up the same
  ~70 spurious tiger-geocoder/topology-extension `drop_table`/
  `drop_index` operations as every prior wave — hand-pruned down to
  exactly the three real `create_table`s this wave owns
  (`admin_audit_log`, `notification_preferences`, `push_tokens`, each
  with its indexes), confirmed by reading the full generated diff
  directly.
- **Verified apply → rollback → re-apply** against that same throwaway
  container (never against the real pilot DB, out of scope and gated
  on the separate task-0008 human-approval step): `alembic upgrade
  head` created all three tables on top of tasks 0008/0010's existing
  schema (confirmed via `\dt`); `alembic downgrade -1` dropped exactly
  those three and confirmed every pre-existing table (`subscriptions`,
  `payments`, `user_locations`, `verifications`, etc.) was untouched;
  `alembic upgrade head` again recreated all three cleanly. Container
  torn down after.
- Swept every file I touched for the `status_code=204/201` + bare
  `-> None` → needs `response_model=None` gotcha: I added no new
  routes (only service-layer notification calls), so nothing needed
  it.
- Full suites, independently run by me:
  - Backend: `services/backend/.venv/Scripts/python.exe -m pytest -q`
    → **245 passed**, 0 failed. `ruff check .` → all checks passed.
  - Mobile: `npm run typecheck` (0 errors), `npm run lint` (0 errors
    after the one fix above), `npm test` → **16 suites / 91 tests
    passed**.
  - Admin-web: `npm run typecheck` (0 errors), `npm run lint` (0
    errors), `npm test` → **9 suites / 28 tests passed**, `npm run
    build` → compiled successfully, all 7 routes generated (including
    the new `/audit` page).
  - Marketing-site: `npm run typecheck` (0 errors), `npm run lint` (0
    errors), `npm test` → **4 suites / 11 tests passed**, `npm run
    build` → compiled successfully, all 7 routes generated (home,
    pricing, faq, and the four new legal/safety/contact pages plus
    account-deletion).

## Explicitly deferred / out of scope (not a gap, a judgment call)

- **Account deletion is not implemented anywhere** (no backend route,
  no mobile UI) — only the marketing-site's informational page exists
  (`src/app/account-deletion/`), as B9 itself flagged. This is a
  backlog item for a future wave, not part of this wave's scope (the
  plan never assigned a backend/mobile owner for it).
- **Analytics dropped from this wave's scope** (per `plan.md`'s
  validator fix #4) — no backend aggregate-query endpoints exist and
  none were added; a future wave should pair a backend-analytics
  subtask with any admin-web analytics UI.
- Task 0013 (deploying admin-web/marketing-site as new Docker
  services) is a separate, still-in-progress task sharing some of the
  same files (`next.config.js`'s `output: "standalone"` addition,
  both apps' new `Dockerfile`/`.dockerignore`, `infra/docker-compose/
  **`, `infra/terraform/envs/pilot/**`, `.github/workflows/deploy.yml`).
  None of those paths were touched, staged, or committed by this task
  — confirmed by checking `tasks/0013-deploy-admin-web-and-marketing-
  site/plan.md`'s stated file list and leaving every one of those
  paths exactly as this task found it (still present as unstaged
  working-tree changes/untracked files for task 0013 to pick up and
  commit separately).

Moves to `done` only once the pilot DB migration is actually applied
(a separate, already-gated human-approval step) and live deploy
verification passes.
