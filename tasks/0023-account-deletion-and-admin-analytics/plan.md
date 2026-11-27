# Plan: 0023-account-deletion-and-admin-analytics

## Goal

Two genuine, previously-identified gaps against the product's actual
scope, not new speculative features:

1. **Account deletion** — listed as a required Free-plan/safety feature
   in `docs/product-plan.md` (Module 1, Module 11), and
   `apps/marketing-site`'s account-deletion-instructions page (task
   0017) already describes a self-service flow — but B9's own report
   from that task confirmed **no backend route and no mobile UI
   actually exist**. The marketing site has been describing a feature
   that doesn't exist.
2. **Admin analytics** — explicitly scoped into Wave 3's plan, then
   explicitly dropped because "no backend aggregate-query endpoints
   exist and no subtask in this wave's decomposition was assigned to
   build them" (`tasks/0012-wave3-engagement-and-lifecycle/plan.md`'s
   validation section). admin-web's home page (`src/app/page.tsx`) is
   still a stale "quick links" stub listing only 2 of the 6 real admin
   tools that exist today.

## Pre-confirmed schema facts (checked directly, not assumed)

- `User.is_active` (bool, default `True`) **already** does two of the
  three things account deletion needs, for free:
  - `discovery_service.py` lines 80/120 already filter
    `User.is_active.is_(True)` out of the discovery feed.
  - `auth/dependencies.py` line 56 already rejects
    `get_current_user` for `not user.is_active` — so flipping this to
    `False` immediately invalidates every existing session/token,
    no separate token-blacklist mechanism needed.
  - **CONFIRMED (not assumed — read directly)**: `admin_service.py`
    `suspend_user` (lines 108-118) sets exactly `user.is_active = False`
    — the same flag self-deletion would use, with no other marker. This
    means a self-deleted account and an admin-suspended account are
    **currently indistinguishable** in the data model — a real,
    confirmed problem, not a hypothetical one. Fix: add a new nullable
    `User.deleted_at: datetime | None` column (needs a migration). Self-
    deletion sets both `is_active = False` AND `deleted_at = now()`;
    admin suspension continues to set only `is_active = False`, leaving
    `deleted_at` null. This gives a clean, queryable distinction (and a
    real timestamp of when deletion happened, useful for any future
    compliance/retention reporting) instead of overloading one boolean
    for two different real situations. This is the single most
    important fix this validation pass made — implement it, don't treat
    it as optional.
  - PII scrubbing (self-deletion should clear `display_name`/`bio`/
    `interests`, which admin-suspension must NOT do, since a suspension
    might be reversed) — **CONFIRMED safe to do via simple field
    mutation, no fix needed elsewhere**: read `matches/routes.py:40`
    and `messaging/routes.py:57-58` directly — both resolve a matched/
    conversation participant's `display_name` via a live
    `db.get(Profile, other_id)` lookup at request time, with no
    `is_active`/join filtering on that lookup. Scrubbing
    `Profile.display_name` to a placeholder (e.g. `"Deleted user"`)
    will correctly and automatically render in every existing matches/
    messaging response with zero code changes needed in those
    features — the plan's original hedge ("confirm or fix, if genuinely
    broken") is resolved: it is not broken, no fix needed there.
- `Profile.city` (string, required) and `User.created_at` (timestamptz)
  both exist and are real, usable fields for city-wise/daily-
  registration analytics — no schema change needed for the basic
  analytics scope below.
- admin-web already has 5 real tool pages (`/users`, `/reports`,
  `/verification`, `/payments`, `/audit`) plus the stale `/` stub — the
  Dashboard is the one page that should actually show analytics, not
  quick links to the other pages (which are already reachable via the
  sidebar nav anyway, making the current page's content redundant).

## Scope

### 1. Backend: account deletion
- New endpoint: **`POST /auth/account/delete`** — confirmed the right
  convention by reading `features/auth/routes.py` directly: every
  existing endpoint in this feature is `POST` with a plain action-verb
  path (`/otp/request`, `/otp/verify`, `/refresh`, `/logout`) — there is
  no RESTful `DELETE`-verb precedent anywhere in this feature, so
  `DELETE /auth/me` would be inconsistent with the codebase's actual
  convention. Use `POST /auth/account/delete`, `status_code=204`,
  `response_model=None` (the existing 204/201-bare-`None` gotcha every
  prior wave has hit). Authenticated via `get_current_user`, no request
  body needed. On call:
  - Set `is_active = False` **and** `deleted_at = now()` on the `User`
    row (the new column — see the schema-facts section above for why
    both fields are needed, confirmed necessary, not optional).
  - Scrub PII on the linked `Profile`: `display_name` -> a fixed
    placeholder like `"Deleted user"`, clear `bio`/`interests`, keep
    `city`/`locality`/`gender`/`relationship_intention`/`created_at`
    intact (not PII, and useful for aggregate analytics that shouldn't
    break when accounts are deleted).
  - Do NOT delete `Match`/`Conversation`/`Message` rows — confirmed
    safe to leave as-is; no fix needed in `matches`/`messaging` (see
    schema-facts section — this was independently verified, not
    assumed).
  - This is irreversible from the user's own perspective — no "undo"
    endpoint needed this wave (an admin could still manually clear
    `deleted_at`/flip `is_active` back via direct DB access in an
    exceptional case, same as any other support situation today).
- Tests: successful deletion sets both `is_active = False` and
  `deleted_at` to a real timestamp, and scrubs PII; a deleted user's
  existing token is immediately rejected on the next request
  (`get_current_user` -> 401); a deleted user disappears from the
  discovery feed; an admin-suspended user (via `suspend_user`) has
  `is_active = False` but `deleted_at` still `None` — the two cases are
  now distinguishable by this field, write a test asserting exactly
  that distinction.

### 2. Backend: admin analytics
- New read-only, `require_admin`-gated endpoint(s) in `features/admin/`
  (extend the existing feature, same pattern every prior admin addition
  in this codebase has used) returning:
  - Total users, total completed profiles.
  - Registrations by day for the last 30 days (`User.created_at`
    grouped by date) — simple COUNT/GROUP BY, no new tracking needed.
  - Users by city (`Profile.city`, GROUP BY, COUNT) — top N or all,
    your call based on what's cleanly queryable.
  - Total likes, total matches, total messages sent (simple COUNTs
    against the existing `Like`/`Match`/`Message` tables).
  - Active Premium subscriber count — **confirmed exact condition**
    (read `subscriptions_service.py:68-80`'s `has_active_premium`
    directly): `Subscription.status == "active" AND Subscription.
    expires_at > now()`. Do not call `has_active_premium` per-user in a
    loop for this — write a single aggregate query
    (`SELECT COUNT(DISTINCT user_id) FROM subscriptions WHERE status =
    'active' AND expires_at > :now`) using the exact same two
    conditions, since looping per-user would be needlessly slow for an
    admin summary stat.
  - **Explicitly NOT in scope**: true DAU/WAU (requires a
    last-active-at/session-activity tracking mechanism that doesn't
    exist yet and would be a materially larger addition — flag this as
    a real, named future gap in your report rather than building a fake
    proxy for it or silently skipping the mention).
- Tests: non-admin gets 403; the aggregate numbers are correct against
  a small constructed dataset (known counts in, known counts out).

### 3. Mobile: account-deletion UI
- A "Delete my account" entry point in
  `apps/mobile/src/features/profile/screens/ProfileScreen.tsx`.
  **Confirmed exact precedent, lines 93-97**: Subscription/
  Verification/Notification-preferences entry points are each a shared
  `Button` component (`apps/mobile/src/components/Button.tsx`) with
  `variant="secondary"` and `onPress={() => navigation.navigate('...')}`,
  with "Log out" (line 97) as the last button in that stack. Add
  "Delete my account" immediately after "Log out", same `Button`
  component. **Correction**: `Button` only has two variants,
  `'primary' | 'secondary'` — there is no `'danger'`/`'destructive'`
  variant to use here; use `variant="secondary"` like every other
  entry point (the confirmation dialog below, not button color, is
  what signals severity).
- A real confirmation step before firing the irreversible action.
  **Confirmed exact existing pattern to mirror** (`apps/mobile/src/
  features/safety/components/BlockButton.tsx:18-25`): this app already
  has a consequential-action confirmation convention using React
  Native's native `Alert.alert(title, message, [{ text: 'Cancel',
  style: 'cancel' }, { text: '<Action>', style: 'destructive', onPress:
  ... }])`. Use this exact same pattern for account deletion — do not
  build a new confirmation screen/component, this one already exists
  and is the established convention.
- On confirm: call the new backend endpoint, then clear local session/
  auth state (same mechanism `useLogout` already uses) and navigate to
  the login screen.
- Tests: match this app's existing pure-function/hook-level convention
  (no component-rendering tests exist in this app) — cover the
  confirmation-gating logic and the post-deletion session-clear/
  navigation behavior at that level.

### 4. Admin-web: real Dashboard page
- Replace `src/app/page.tsx`'s stale "quick links" stub with a real
  analytics dashboard consuming subtask 2's new endpoint(s): summary
  stat tiles (total users, total profiles, active Premium count, total
  matches/messages), a simple registrations-by-day chart or table, and
  a city-breakdown table. **Confirmed**: `package.json` has zero
  charting dependency (`chart`/`recharts`/`victory`/`d3` all absent) —
  use a plain table or CSS-bar visualization, a full charting library
  is not justified for this scope.
- Use the existing shared `Table`/`Badge`/primitives from task 0022's
  just-completed consistency pass rather than inventing new ad-hoc
  markup.
- Tests: match this app's existing pure-logic-level convention.

## Decomposition (parallel, disjoint)

1. **Backend: account deletion** —
   `services/backend/packages/api/features/auth/**` (new endpoint,
   plus the new `User.deleted_at` column on the `User` model — model
   change only, the actual Alembic migration is integration-step-only
   per this codebase's standing convention, same as every prior wave),
   `services/backend/packages/api/features/profiles/**` (PII-scrub
   logic — reasonable to put the scrub function in `profiles/` since it
   mutates a `Profile` row, called from the auth route; use judgment on
   exact placement, just keep it importable, not duplicated). Read-only
   access to `features/admin/admin_service.py` (already confirmed
   `suspend_user`'s exact behavior above — no further investigation
   needed, just don't write to that file) and to `features/matches/`/
   `features/messaging/` (already confirmed no fix needed there — don't
   touch those files at all this wave). Import `User`/`Profile` from
   their owning modules, never redefine — same rule as every prior
   wave.
2. **Backend: admin analytics** —
   `services/backend/packages/api/features/admin/**` only (new
   endpoints/service functions, same feature every prior admin
   addition has extended).
3. **Mobile: account-deletion UI** — `apps/mobile/src/features/profile/**`
   (the `Alert.alert` confirmation lives directly in `ProfileScreen.tsx`
   or a small handler alongside it, per the `BlockButton.tsx` precedent
   above — no dedicated confirmation screen needed). **Confirmed**: no
   `apps/mobile/src/features/account/` directory exists today; create a
   new `features/account/api/**` (the delete-account API call, mirrored
   on other features' `api/*.api.ts` pattern) if you want the API call
   isolated from `profile/`, or keep it directly in `features/profile/`
   if that's cleaner given how small this is — your call, either is
   reasonable, just don't duplicate an API client function if one for
   calling authenticated POST endpoints already exists to reuse.
4. **Admin-web: Dashboard** — `apps/admin-web/src/app/page.tsx` and a
   new `apps/admin-web/src/features/dashboard/**`.

Subtasks 1 and 2 both touch `features/admin/**` conceptually (1 reads
it, 2 extends it) — to avoid a collision, subtask 1 must only READ
`admin_service.py` (to check the suspend-vs-delete question), never
write to it; subtask 2 owns all writes to `features/admin/**`. State
this explicitly in `ownership.md`.

## Validation step (completed 2026-11-28)

**Verdict: plan was not ready as-written — one confirmed-necessary
schema addition was missing (`User.deleted_at`, to distinguish self-
deletion from admin suspension, since both share `is_active` — verified
by reading `admin_service.py` directly), the REST endpoint convention
was underspecified (now pinned to `POST /auth/account/delete`, matching
this feature's exclusively-POST existing convention), two "check/fix if
broken" hedges were resolved to "confirmed fine, no fix needed" (PII-
scrub flowing through matches/messaging; no charting library exists),
and the mobile subtask's vague "check for existing patterns" was
replaced with exact file/line citations for both the entry-point button
placement and the confirmation-dialog pattern, including a wrong
assumption corrected (no `danger`/`destructive` Button variant exists,
only `primary`/`secondary`). Every scope item above is now grounded in
a direct file read, not an assumption. Ready for four-way parallel
dispatch.**

Owned-path disjointness re-confirmed — no change needed to
`ownership.md`.

## Risks

- Irreversible self-service action — the confirmation UX matters more
  here than almost anywhere else in the app; don't let it be a single
  careless tap.
- PII-scrubbing must not break existing matches/conversations for the
  *other* party — verify this explicitly, don't assume.
- Analytics scope is deliberately bounded to COUNT/GROUP BY queries
  against existing data — true activity-based DAU/WAU is a named,
  explicitly out-of-scope future gap, not something to approximate
  with a misleading proxy metric.

## Rollback

Each subtask confined to its own paths; revert any one independently.
Account deletion's `is_active` flip is reversible at the DB level by a
human operator even though no user-facing undo exists.
