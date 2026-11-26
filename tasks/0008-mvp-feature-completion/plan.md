# Plan: 0008-mvp-feature-completion

## Goal

Replace the 501-stub feature slices from the initial scaffold with real,
working MVP functionality end-to-end: backend business logic + DB models,
mobile screens, admin-web screens — covering exactly the "Focused MVP
slice" scope already agreed with the user (auth/OTP, onboarding, profiles,
city-based location, discovery/swipe, likes+quota, matching, basic text
messaging, block/report, minimal admin). Payments, GPS/Premium nearby
discovery, verification, and compatibility scoring remain explicitly
deferred to a later wave.

This is the user's explicit instruction to run continuously, unattended:
plan → an independent agent validates the plan → parallel implementation →
integrate/test → commit/push (which auto-deploys via the existing
pipeline) → immediately plan the next wave. No pausing for confirmation
between waves.

## Shared contract (must match exactly across every subtask below — this is
what makes disjoint parallel implementation safe)

### Database tables (SQLAlchemy models, one feature owns each table's file)

- `users` (auth): id (UUID4), phone_number (unique, indexed), email
  (nullable, unique), date_of_birth, is_active (bool, default true),
  is_admin (bool, default false), created_at, updated_at.
- `sessions` (auth): id, user_id FK, refresh_token_hash, created_at,
  expires_at, revoked_at (nullable).
- `profiles` (profiles): id (UUID4), user_id FK `users.id` (unique),
  display_name, gender, orientation_preferences (JSON list), relationship_intention
  (string: serious|casual|open|figuring_out), bio (text, nullable),
  interests (JSON list, nullable), city, locality, created_at, updated_at.
- `profile_photos` (profiles): id, profile_id FK, s3_key, position (int),
  is_primary (bool), created_at.
- `likes` (discovery): id, from_profile_id FK `profiles.id`, to_profile_id
  FK `profiles.id`, created_at; unique(from_profile_id, to_profile_id).
- `passes` (discovery): same shape as `likes`.
- `matches` (discovery): id, profile_a_id FK `profiles.id`, profile_b_id FK
  `profiles.id` (always store with the lexicographically/numerically
  smaller UUID as `profile_a_id` so a pair is never stored both ways —
  prevents duplicate matches), is_active (bool, default true), created_at.
- `conversations` (messaging): id, match_id FK `matches.id` (unique),
  created_at.
- `messages` (messaging): id, conversation_id FK, sender_profile_id FK,
  content (text), created_at, read_at (nullable).
- `blocks` (safety): id, blocker_profile_id FK `profiles.id`,
  blocked_profile_id FK `profiles.id`, created_at; unique(blocker, blocked).
- `reports` (safety): id, reporter_profile_id FK, reported_profile_id FK,
  reason (string), details (text, nullable), status (string, default
  `"open"`), created_at.

### Cross-feature model imports (hard rule — prevents a SQLAlchemy
`Table already defined` crash at integration time)

A subtask may declare a bare `ForeignKey("tablename.id")` string freely
without importing anything. But the moment a subtask needs to *query* a
table it doesn't own, it MUST import that table's existing ORM class from
its owning module — it must NEVER declare a second class mapped to the same
table name (SQLAlchemy raises `Table 'x' is already defined for this
MetaData instance` the instant both get imported together). Exact import
paths:

- B2 imports `Block` from `packages.api.features.safety.models` for
  discovery's block-exclusion query — does not redefine it.
- B3 imports `Match` from `packages.api.features.discovery.models` (needed
  for `conversations.match_id` FK / validating a match exists before
  creating a conversation) — does not redefine it.
- B2 and B3 both import `User` from `packages.api.features.auth.models` and
  `Profile` from `packages.api.features.profiles.models` wherever they need
  to query/join on them (discovery candidates, admin user search, safety
  block/report targets) — never redefine either.

### Auth dependency (built by the auth subtask, imported read-only by every
other subtask — never copy/reimplement it)

`packages/api/features/auth/dependencies.py` exports
`get_current_user(...) -> User` and `get_current_profile(...) -> Profile`
as FastAPI `Depends()`-compatible callables, validating a `Bearer <JWT>`
access token (`pyjwt`, already added to `requirements.txt`). Every
authenticated endpoint in every other subtask imports and uses these two
functions — never duplicates JWT logic.

### Endpoint contract (exact paths/payloads — mobile and admin-web build
against this without waiting for the backend to literally exist first)

- `POST /auth/otp/request {phone_number}` → 202
- `POST /auth/otp/verify {phone_number, code}` → 200
  `{access_token, refresh_token, user_id, is_new_user}`
- `POST /auth/refresh {refresh_token}` → 200 `{access_token, refresh_token}`
- `POST /auth/logout {refresh_token}` → 204
- `POST /onboarding/profile {display_name, date_of_birth, gender,
  orientation_preferences, relationship_intention, city, locality, bio?,
  interests?}` → 201 Profile
- `GET /profiles/me` → 200 Profile
- `PATCH /profiles/me {...partial}` → 200 Profile
- `POST /profiles/me/photos/presign {content_type}` → 200
  `{upload_url, s3_key}` (client PUTs the file directly to S3 with this URL)
- `POST /profiles/me/photos/confirm {s3_key, position}` → 201
- `GET /profiles/{profile_id}` → 200 PublicProfile — excludes
  `phone_number`, `email`, `date_of_birth` (expose a computed `age` field
  instead of raw DOB); should also check the `blocks` table (either
  direction) and return 404 if either party has blocked the other (nice to
  have this wave, not a hard blocker)
- `GET /discovery/feed?limit=10&offset=0` → 200 `{profiles: [...], next_offset}`
- `POST /discovery/pass {to_profile_id}` → 204
- `POST /likes {to_profile_id}` → 201 `{like_id, matched, match_id?}`
  (403 `{error: "quota_exceeded"}` once the daily free quota is used)
- `GET /likes/quota` → 200 `{used, limit, resets_at}`
- `GET /matches` → 200 `{matches: [...]}`
- `POST /matches/{match_id}/unmatch` → 204
- `GET /conversations` → 200 list
- `GET /conversations/{id}/messages?limit&before` → 200 list
- `POST /conversations/{id}/messages {content}` → 201 Message
- `POST /blocks {profile_id}` → 204
- `POST /reports {profile_id, reason, details?}` → 201
- `GET /admin/users?query=` → 200 list (requires `is_admin`)
- `POST /admin/users/{id}/suspend` → 204
- `GET /admin/reports?status=open` → 200 list
- `POST /admin/reports/{id}/resolve {action}` → 200

### Business rules every relevant subtask must enforce

- Daily like quota: 20 likes/day per profile, counted by `created_at >=`
  start of the current UTC day (documented MVP simplification — true
  per-user-timezone reset is deferred; no premium tier distinction yet,
  since payments/premium are out of this wave's scope).
- Discovery feed excludes: self, already-liked targets, already-passed
  targets, anyone in either direction of the `blocks` table, inactive
  accounts; same-city match only (no radius/GPS this wave).
- OTP: 6-digit code, stored in Redis with a 5-minute TTL (reuse the
  existing `redis` client), delivery via a `send_otp_sms(phone, code)`
  function that logs the code (structured log) rather than calling a real
  SMS provider — no SMS provider credentials exist yet; this is a
  deliberate, documented stub, not a bug.
- A mutual like (both directions exist in `likes`) creates exactly one
  `matches` row (normalized pair) — never duplicates.

## Decomposition (parallel, disjoint)

**Backend** (`services/backend/packages/api/features/**`, one subtask per
group, no subtask touches `core/`, `main.py`, `requirements.txt`, or
`db/migrations/` — those are integration-step concerns, after all land):

1. **auth + onboarding + profiles + location** — `features/auth/**`,
   `features/onboarding/**`, `features/profiles/**`, `features/location/**`
   (`location/` stays as its current stub this wave — city/locality are
   already carried as plain fields on `profiles`/`onboarding`; do not invent
   new endpoints here)
2. **discovery + likes + matches** — `features/discovery/**`,
   `features/likes/**`, `features/matches/**`
3. **messaging + safety + notifications + admin** — `features/messaging/**`,
   `features/safety/**`, `features/notifications/**`, `features/admin/**`

**Mobile** (`apps/mobile/src/features/**`, shared `core/`/`components/` are
read-only — only ADD new files there if truly needed, never edit existing
shared files):

4. **auth + onboarding + profile screens** — `src/features/auth/**`,
   `src/features/onboarding/**`, `src/features/profile/**`
5. **discovery + likes + matches + messaging + safety screens** —
   `src/features/discovery/**`, `src/features/likes/**`,
   `src/features/matches/**`, `src/features/messaging/**`,
   `src/features/safety/**`

**Admin-web**:

6. **users + reports + moderation screens** —
   `apps/admin-web/src/features/{users,reports,moderation}/**`

## Validation step (before dispatch)

A separate agent (not the one that wrote this plan) reviews this plan.md
for: schema consistency, endpoint contract completeness, missing business
rules, and any path overlap between the six subtasks above, before any
implementation agent is dispatched.

## Integration step (after all six land)

One agent: import all new model modules, run
`alembic revision --autogenerate` once (single coherent migration covering
every new table), run the full backend test suite + mobile/admin-web
lint/typecheck/test, fix any integration-level breakage, commit, push
(triggers CI + auto-deploy). Then immediately plan the next wave (deferred
features) without waiting for further instruction.

## Risks

- **Cross-feature coupling**: discovery (subtask 2) reads the `blocks`
  table owned by subtask 3 — both subtasks are given the identical schema
  above so this works without either editing the other's files.
- **Shared migration history**: mitigated by deferring all Alembic
  migration generation to the single integration step, not any parallel
  subtask.
- **Contract drift between mobile/admin-web and backend**: mitigated by
  every subtask building against the exact endpoint contract above, not
  improvising its own.

## Rollback

Each subtask's changes are confined to its own feature directories;
`git revert` the integration commit reverts everything from this wave at
once if needed.
