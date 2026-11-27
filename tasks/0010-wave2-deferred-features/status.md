# Status: 0010-wave2-deferred-features

**State:** verifying (every reconciliation item fixed and independently
re-verified; committed and pushed to `main`)

## Definition-of-done checklist

- [x] Plan validated by an independent agent — found and fixed one
      real schema-ownership gap (GPS coordinates were ambiguously
      described as living on `profiles`, which no subtask owns this
      wave — moved to a new `UserLocation` class inside B5's own
      `features/location/**`), one missing entitlement check
      (compatibility insights wasn't gated behind `has_active_premium`
      despite the product plan listing it as Premium-only), and two
      under-specified details (radius enum, distance-banding scheme)
      that would have caused each implementing agent to guess
      differently. Also flagged an `env.py` model-import risk for the
      integration step. All fixes applied directly to `plan.md`/
      `ownership.md` — see `plan.md`'s "Validation step" section.
- [x] B4 (subscriptions/payments) implemented, tested — 14/14 green
- [x] B5 (GPS discovery + compatibility) implemented, tested —
      181/181 full backend suite green
- [x] B6 (verification) implemented, tested — 23/23 green
- [x] M3 (mobile Premium/GPS/verification screens) implemented,
      tested — 50/50 green, typecheck/lint clean
- [x] W2 (admin-web verification + payments monitoring) implemented,
      tested — 17/17 green, typecheck/lint/build clean
- [x] Integration: reconciled every contract mismatch (below), wired
      `main.py`/`env.py`, generated and hand-verified the migration,
      full test suites green across backend (199/199, up from 181)/
      mobile (57/57, up from 50)/admin-web (17/17, unchanged count —
      fixed in place, no new admin-web tests needed)
- [x] Committed and pushed to `main`
- [ ] Deploy verification — **blocked until the task-0008 DB-migration
      human-approval step is resolved** (pilot DB schema, including
      this wave's four new tables, still does not exist on the live
      instance); code-level work does not wait on this, but live
      verification does. Same pre-existing blocker documented in
      `tasks/0008-mvp-feature-completion/status.md`, not reopened or
      re-attempted here (explicitly out of scope per this task's
      instructions — Wave 2's migration was verified only against a
      local throwaway Postgres, never against the real pilot DB).
- [ ] Next wave planned immediately after

## Integration-step reconciliation — what was actually changed

Three background agents ran in parallel on disjoint paths (backend;
admin-web's verification client; mobile's subscriptions client + GPS
capture), coordinated by me as integrator deciding the exact contract
each side would meet so none of them had to guess the other's output.
I independently re-ran every verification step myself afterward
(pytest/ruff for backend, typecheck/lint/jest/build for both frontends,
plus the migration apply/rollback/re-apply cycle) rather than trusting
the agents' own reports — all confirmed green.

### 1. Verification admin contract mismatch — fixed

Backend (`services/backend/packages/api/features/admin/`): generalized
`GET /admin/verifications/pending` into `GET /admin/verifications`
accepting `?status=pending|approved|rejected|all` (default `pending`,
so the bare endpoint behaves exactly like the old `/pending` path did).
Added `validate_verification_status` to `validation.py` (same
400-on-invalid pattern as `validate_report_status`); generalized
`admin_service.list_pending_verifications` into
`list_verifications(db, status_filter)`. `POST
/admin/verifications/{id}/review` (body `{decision}`) was already
correct and untouched. Updated the two existing tests in
`test_admin.py` that hit the old literal `/pending` path to the new
default path, and added four new tests (`approved`/`rejected`/`all`
filtering, invalid-status 400).

Admin-web (`apps/admin-web/src/features/verification/api/verification.api.ts`):
fixed the wire-format field `profile_display_name` (assumed, optional)
to the real `display_name` (required) `VerificationAdminOut` sends;
replaced the two wrong assumed endpoints (`POST .../approve`, `POST
.../reject`, no body) with a single real `reviewVerification(id,
decision)` hitting `POST /admin/verifications/{id}/review` with body
`{decision}` — kept thin `approveVerification`/`rejectVerification`
wrappers so `hooks/useVerifications.ts` and
`components/VerificationQueue.tsx` needed zero call-site changes.
Updated `verification.api.test.ts` fixtures accordingly. Stale
"ASSUMED .../not yet landed" comments replaced with the real contract.

### 2. No admin subscriptions/payments listing endpoints — added

Added `GET /admin/subscriptions?status=active|expired|cancelled|all`
(default `all`) and `GET /admin/payments?status=pending|succeeded|failed|refunded|all`
(default `all`) to `features/admin/**`, both gated by `require_admin`.
`Subscription`/`Payment` imported read-only from
`features/subscriptions/models.py` (never redefined), per the plan's
cross-feature-model-import rule. New `SubscriptionAdminOut`/
`PaymentAdminOut` schemas match the admin-web client's already-correct
assumed field names exactly (both were "ASSUMED" shapes in
`apps/admin-web/src/features/payments/api/{subscriptions,payments}.api.ts`
that turned out to need **no changes** — verified by reading both
files directly). Added `make_subscription`/`make_payment` test
factories to `tests/features/admin/conftest.py` (same style as the
existing `make_user`/`make_verification`), and 8 new tests: 403 for a
non-admin caller, correct listing/filtering for each status value on
both endpoints, empty-list behavior, invalid-status 400.

### 3. Mobile's invented checkout-completion endpoint — added, with a real contract

Added two things to `features/subscriptions/**`:
- `GET /subscriptions/me` — the caller's current subscription
  (`SubscriptionOut`, unchanged shape), preferring an active-unexpired
  row, else the most-recently-created row, else 404. Mobile's
  `fetchMySubscription` already assumed exactly this shape/behavior —
  confirmed correct, no mobile change needed for this one.
- `POST /subscriptions/checkout-session/{session_id}/sandbox-complete`
  — explicitly marked **sandbox-only, must be removed once real
  Razorpay keys are wired** (in both a route-level comment and its
  docstring). Takes a required `{plan}` body (the client already has
  this in scope from its own checkout UI state, since `/checkout-session`
  deliberately persists no pending-checkout row to look it up from).
  Builds a Razorpay-webhook-shaped `payment.captured` payload, computes
  a real HMAC signature over it, and calls
  `subscriptions_service.process_razorpay_webhook` directly — reusing
  the real activation logic verbatim rather than duplicating it. Also
  added an additive `session_id` field to `CheckoutSessionResponse`
  (same value as the existing `order_id`, which stays for backward
  compatibility with the existing `test_checkout_session_creation`
  test). Added the exact test the plan called for (checkout-session →
  sandbox-complete → active `Subscription` + linked `Payment` row →
  `has_active_premium` now `True`), plus unknown-plan 400 and
  unauthenticated 401 cases.

  Mobile (`apps/mobile/src/features/subscriptions/api/subscriptions.api.ts`):
  reconciled against the real contract decided above (coordinated with
  the backend agent so neither side guessed): `SubscriptionPlanApiResponse`
  fixed to the real `{plan, label, duration_days, price_minor_units,
  currency}` (no `id`/`name` from the backend — synthesized client-side
  as `id: plan.plan`/`name: plan.label` so no other mobile file needed
  to change); `CheckoutSessionApiResponse` fixed to include the real
  `session_id`/`order_id` pair, with `provider`/`sandbox` hardcoded
  client-side (always `'razorpay'`/`true` this wave — the backend never
  reports them); `completeSandboxCheckout(sessionId, plan)` now sends
  the required `{plan}` body, with its one call site in
  `useCheckoutSession.ts` updated to pass it. Added
  `subscriptions.api.test.ts` covering the plan id/name synthesis and
  the sandbox-complete body shape, pure-function level per this repo's
  test convention.

### 4. Mobile never captured real GPS coordinates — added

Added `expo-location` via `npx expo install expo-location` (landed at
`~58.0.23`, SDK-resolved rather than hand-picked). New
`apps/mobile/src/features/location/api/location.api.ts` exposes
`updateMyLocation(latitude, longitude)` → `PUT /location/me` via the
shared `apiClient` (kept as its own `features/location/**` directory
rather than folding into `discovery/api/`, to preserve this repo's
1:1 mobile-feature-to-backend-feature naming convention). New
`useLocationSync(isPremium)` hook (`features/discovery/hooks/`):
when Premium, requests foreground location permission, and if
granted, reads the current position and PUTs it — wired into
`DiscoveryScreen.tsx` on mount, as a side-effect added to the
**existing** Premium gate (the gate itself, `isPremium` from
`useIsPremium()`, was not changed). Fails closed on any error
(permission denied, location service disabled, or a failed PUT) rather
than ever crashing the screen.

`RadiusPicker.tsx` gained a `locationPermissionDenied` prop producing a
second, distinct locked state (message: "Location permission is
required to use the radius picker. Enable it in your device
settings.") alongside the pre-existing Premium-upsell locked state —
backed by a new pure decision function,
`resolveRadiusPickerDisabledReason(isPremium, locationPermissionDenied)`
in `radius.ts`, tested directly in `radius.test.ts` for all four
input combinations (this repo's established convention: no
component-rendering tests exist anywhere in the mobile suite, only
pure-function/hook-level tests). The prop defaults to `false` so
`ProfileScreen.tsx`'s existing `RadiusPicker` call site (which doesn't
track location permission) kept compiling with zero changes.

### 5. Standard integration duties — all completed

- `services/backend/db/migrations/env.py`: added model imports for
  `location`, `subscriptions`, and `verification`; replaced the stale
  "`onboarding` and `location` intentionally skipped" comment with one
  reflecting the real current state (only `onboarding` still has no
  ORM classes; the other three gained real tables this wave).
- Generated `944289c57ada_wave_2_subscriptions_payments_.py` via
  `alembic revision --autogenerate` against a throwaway
  `postgis/postgis:16-3.4` container (same image/method as task 0008's
  own migration). Autogenerate picked up the identical category of
  noise task 0008 hit — ~70 spurious `drop_table`/`drop_index`
  operations for tiger-geocoder/topology extension-owned tables the
  base image creates by default — hand-pruned down to exactly the four
  real `create_table`s this wave owns (`subscriptions`, `payments`,
  `user_locations`, `verifications`, each with its indexes), confirmed
  by reading the generated diff directly, not by assumption.
- Added `op.execute("CREATE EXTENSION IF NOT EXISTS postgis")` at the
  top of `upgrade()`, idempotent defense-in-depth per plan.md's Risks
  section (the base image's init scripts already install it, but this
  doesn't assume that's guaranteed in every environment).
- **Verified apply → rollback → re-apply** against that same throwaway
  Postgres container (never against the real pilot DB, which is
  explicitly out of scope and gated on the separate, still-open
  task-0008 human-approval step): `alembic upgrade head` created all
  four tables (confirmed via `\dt`); `alembic downgrade -1` dropped
  exactly those four and nothing else (confirmed all pre-existing
  tables from task 0008's migration were untouched); `alembic upgrade
  head` again recreated all four cleanly. Container torn down after.
- Mounted `subscriptions_router` (prefix `/subscriptions`) and
  `verification_router` (prefix `/verification`) in `main.py`.
  Confirmed `location_router` was already mounted from Wave 1 (it
  only needed its routes extended this wave, which B5 already did) —
  left untouched.
- Swept every new/touched route for the `status_code=204/201` +
  bare `-> None` → needs `response_model=None` gotcha: none of this
  wave's new endpoints return 204/201, so none needed it; confirmed
  the one pre-existing 204 route (`suspend_user`) already had it
  correctly, left as-is.
- Full suites, independently re-run by me (not just trusting agent
  reports):
  - Backend: `services/backend/.venv/Scripts/python.exe -m pytest -q`
    → **199 passed**, 0 failed. `ruff check .` → all checks passed.
  - Mobile: `npm run typecheck` (0 errors), `npm run lint` (0 errors),
    `npm test` → **12 suites / 57 tests passed**.
  - Admin-web: `npm run typecheck` (0 errors), `npm run lint` (0
    errors), `npx jest` → **5 suites / 17 tests passed**, `npm run
    build` → compiled successfully, all 9 routes generated.

## Deviations from the literal reconciliation-list wording

None of real substance — every field name, status enum, default, and
endpoint shape the integrator specified to the three parallel agents
matched what they each found in the actual landed code, and both
frontend agents confirmed (by reading, not assuming) that
`apps/admin-web/src/features/payments/**` needed no changes at all.
One judgment call, made explicitly and documented in the backend
agent's own change list: `GET /admin/verifications` orders
`pending`-filtered results oldest-first (preserving the old
`/pending` endpoint's exact behavior) and every other filter value
newest-first (more natural for a review-history view).

Moves to `done` only once the pilot DB migration is actually applied
(a separate, already-gated human-approval step) and live deploy
verification passes.
