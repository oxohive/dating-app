# Plan: 0010-wave2-deferred-features

## Goal

Build out the four feature areas explicitly deferred from the MVP slice
(per the user's earlier confirmed scope decision): subscriptions/payments,
GPS/Premium nearby discovery, profile verification, and compatibility
insights. This is Wave 2, following the same plan → validate → parallel
implement → integrate → push cycle as `tasks/0008`.

**Known pre-condition:** the pilot database schema has not been migrated
yet (`tasks/0008`'s one remaining blocker — needs explicit human approval
for a Bash permission classifier denial, documented in
`tasks/0008-mvp-feature-completion/status.md`). This wave's code can be
written, tested locally (SQLite/in-memory, same convention as every prior
subtask), and reviewed without that migration existing — but end-to-end
liveness verification against the real pilot instance is blocked until a
human runs it. Code-level work proceeds regardless; deploy-verification
steps wait.

## Scope (new, additive to the shared schema from tasks/0008)

### New tables

- `subscriptions`: id, user_id FK `users.id`, plan (string:
  daily|weekly|monthly|quarterly|annual), status (active|expired|cancelled),
  started_at, expires_at, created_at.
- `payments`: id, subscription_id FK (nullable — a payment can precede
  subscription activation), user_id FK, provider (string, e.g. "razorpay"),
  provider_payment_id (string, unique), amount_minor_units (int), currency
  (string, default "INR"), status (pending|succeeded|failed|refunded),
  created_at.
- `verifications`: id, profile_id FK `profiles.id` (unique), status
  (pending|approved|rejected), selfie_s3_key (nullable), reviewed_by_user_id
  FK `users.id` (nullable), reviewed_at (nullable), created_at.
- No new table for compatibility insights — it's a computed, not stored,
  feature (see below).

### Feature behavior

1. **Subscriptions/payments** (backend feature `subscriptions`): plan
   catalogue endpoint, checkout-session creation, a payment-provider
   webhook endpoint (signature-verified, idempotent on
   `provider_payment_id`), entitlement check helper
   (`has_active_premium(user_id) -> bool`) other features will call. Use
   Razorpay's documented webhook payload shape (don't invent a fake
   provider contract) but DO NOT wire real Razorpay API keys/secrets this
   wave — build against their documented schema with a stubbed/sandboxed
   client, clearly marked, same spirit as the OTP-SMS stub from wave 1.
2. **GPS/Premium nearby discovery** (extends `discovery`/`location`):
   GPS coordinates live in a **new `UserLocation` ORM class in
   `features/location/models.py`** (`id`, `profile_id` FK `profiles.id`
   unique, `latitude`/`longitude` as `Double`, `updated_at`) — **not** as
   new columns on `Profile`. `features/profiles/**` is not in this
   subtask's (or anyone's, this wave) owned paths, so the GPS columns
   must not live there; `location/models.py` currently has no ORM classes
   (placeholder docstring only) and is exactly where this belongs per its
   own `__init__.py` docstring ("Location feature (PostGIS-backed geo
   position updates)"). Gate writes/reads behind `has_active_premium`.
   PostGIS radius query (reuse the already-provisioned `postgis/postgis`
   image — this is the first feature to actually use the PostGIS
   extension). Radius is a fixed enum, not a free-form value — use
   exactly the tiers the product plan already specifies: **1, 3, 5, 10,
   25, 50, 100 (km), or "any"**. Explicitly never expose raw lat/lng to
   other users in any response — only approximate distance banding, using
   this fixed scheme so every implementer bands identically: `<1km`,
   `1-3km`, `3-5km`, `5-10km`, `10-25km`, `25-50km`, `50-100km`,
   `100km+` (round down to the containing band; never show a precise
   decimal distance).
3. **Verification** (new backend feature `verification`): selfie upload
   (presign/confirm, same S3 pattern as profile photos), status endpoint,
   an admin review queue extending the existing `admin` feature.
4. **Compatibility insights** (extends `discovery`): a transparent,
   explainable score (not ML) combining relationship-intention match,
   shared interests, and proximity, surfaced on `GET /profiles/{id}` and
   the discovery feed as a breakdown, not a black-box number — matching the
   product plan's explicit "do not present as scientifically proven"
   requirement. **This breakdown is itself Premium-gated** (per
   `docs/product-plan.md` §4.2 — "Compatibility insights" / "Advanced
   compatibility analysis" are listed under the Premium plan, not Free):
   call `has_active_premium` before including the breakdown. Free users
   keep the existing, already-shipped "basic compatibility information"
   (shared `interests`/`relationship_intention` fields already returned by
   `GET /profiles/{id}` and the discovery feed since task 0008) — do not
   remove or gate those existing fields, only the new score/breakdown.

## Decomposition (parallel, disjoint — mirrors tasks/0008's pattern)

1. **Backend: subscriptions/payments** — `features/subscriptions/**`
   (new), entitlement helper importable by other features.
2. **Backend: GPS discovery + compatibility insights** — extends
   `features/discovery/**`, `features/location/**` (first real use of this
   previously-stub feature).
3. **Backend: verification** — new `features/verification/**`, extends
   `features/admin/**` (review queue).
4. **Mobile**: Premium upsell screens + subscription management, GPS
   radius picker (Premium-gated), verification flow (selfie capture).
5. **Admin-web**: verification review queue, subscription/payment
   monitoring views.

## Validation step (completed — see below)

Same as 0008 — an independent agent reviewed this plan for schema
consistency, cross-feature import correctness, and entitlement-check
coverage (every Premium-gated endpoint must actually call
`has_active_premium`) before dispatch. **Premium-gated surface, confirmed
exhaustive as of this validation pass:** GPS/nearby-discovery
read+write, radius filtering/ranking, and the compatibility-insights
breakdown. All three must call `has_active_premium`; nothing else in this
wave is gated.

**Validator findings, fixed directly in this plan (this pass):**
1. GPS coordinates were ambiguously described as living "on `profiles`",
   which both conflicts with no subtask owning `features/profiles/**`
   this wave and with `location/`'s own pre-existing stub design intent.
   Fixed: GPS lives in a new `UserLocation` class in
   `features/location/models.py` (see item 2 above).
2. Radius was described as a vague "1-100km" range — implementers would
   each guess a different input shape. Fixed: pinned to the exact enum
   the product plan (`docs/product-plan.md` lines 241-248) already
   specifies.
3. "Approximate distance banding" had no concrete definition. Fixed:
   explicit band table added (see item 2 above).
4. Compatibility insights was never actually required to call
   `has_active_premium`, despite the product plan placing it under the
   Premium plan (§4.2) — the only Premium-gated surface this plan missed
   entirely. Fixed: item 4 now requires the check and distinguishes it
   from the pre-existing free "basic compatibility information" fields.
5. **Integration-step risk, not yet hit but predictable from task 0008's
   experience:** `services/backend/db/migrations/env.py` explicitly lists,
   by name, which feature `models` modules it imports for autogenerate,
   with a comment that `location` (and `onboarding`) are deliberately
   skipped because they "intentionally define no ORM classes this wave."
   Once B5 adds `UserLocation` and B4/B6 add their own new model modules,
   that comment goes stale and, if the integration step forgets to add
   `from packages.api.features.location import models as location_models`
   (plus `subscriptions`/`verifications` equivalents) to `env.py`,
   autogenerate will silently produce a migration **missing** the new
   tables — no error, just an incomplete migration (the inverse failure
   mode of task 0008's "redefine a table twice" bug, same root cause
   class: a feature's models not being wired into `env.py`'s metadata).
   The integration agent for this wave must explicitly update `env.py`'s
   imports and its stale comment as part of generating the new migration,
   and verify via `alembic revision --autogenerate` producing a diff that
   actually contains `create_table('subscriptions'|'payments'|
   'verifications')` plus the `location` table, not a no-op diff.

**Precondition re-confirmed:** none of B4/B5/B6's descriptions assume the
task-0008 migration has already run against the pilot DB — all are
written as local/SQLite-or-throwaway-Postgres-testable, consistent with
the "Known pre-condition" note above. No change needed there.

## Risks

- Real payment integration is explicitly NOT happening this wave (no real
  Razorpay keys) — this is a structural/schema wave, not a revenue-ready
  one. Document this clearly so it isn't mistaken for production-payment-
  ready code.
- PostGIS: the `postgis/postgis:16-3.4` base image's own init scripts
  already install and enable the `postgis` extension on a fresh DB (see
  the hand-edit note in
  `services/backend/db/migrations/versions/326cae67e316_initial_mvp_schema.py`),
  so it should already be available on the pilot DB once that migration
  finally runs. B5 must still add an idempotent
  `op.execute("CREATE EXTENSION IF NOT EXISTS postgis")` at the top of its
  own migration's `upgrade()` as defense-in-depth — do not assume the
  image-level init path is guaranteed in every environment this ever
  runs in (e.g. a future non-Docker-image Postgres).
- GPS precision/privacy: the product plan is explicit that raw coordinates
  must never leak — this is a hard constraint for the implementing agent,
  not a nice-to-have. No endpoint response schema may include raw
  `latitude`/`longitude` for any profile other than the caller's own.
- Razorpay webhook: build against Razorpay's real, currently-documented
  webhook payload (event types such as `payment.captured`/
  `payment.failed`, signature in the `X-Razorpay-Signature` header,
  HMAC-SHA256 verified against a stubbed/sandboxed webhook secret) —
  look up the actual current shape rather than guessing field names from
  memory, since webhook schemas do change between provider doc versions.

## Rollback

Each subtask confined to its own directories; integration commit is a
single revertible unit, consistent with every prior wave.
