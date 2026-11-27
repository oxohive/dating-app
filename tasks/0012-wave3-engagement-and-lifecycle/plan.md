# Plan: 0012-wave3-engagement-and-lifecycle

## Goal

Build out the next slice of deferred feature-catalogue items (per
`docs/product-plan.md`) that neither the MVP (task 0008) nor Wave 2
(task 0010) covered: real push notifications, the "see who liked you"
Premium feature, subscription payment history + an admin refund
workflow, the marketing website's actual content, and admin-web
audit-log/analytics views. Wave 3, same plan → validate → parallel
implement → integrate → push cycle as tasks 0008/0010.

**Known pre-condition (unchanged from Wave 2):** the pilot database schema
still has not been migrated against the live instance — this is a
separate, already-documented, human-approval-gated blocker
(`tasks/0008-mvp-feature-completion/status.md`). Code-level work proceeds
regardless; only live/deploy verification of DB-backed endpoints waits on
it.

## Scope

### New tables

- `push_tokens`: id, user_id FK `users.id`, token (string, unique),
  platform (`ios`|`android`), created_at, updated_at.
- `notification_preferences`: id, user_id FK `users.id` unique,
  new_like (bool, default true), new_match (bool, default true),
  new_message (bool, default true), verification_result (bool, default
  true), subscription_events (bool, default true), created_at,
  updated_at. (Security alerts are never user-disable-able — not a
  column, always sent.)
- No new tables needed for "see who liked you" (reuses `likes`), payment
  history (reuses `payments`), or refunds (extends `payments`/
  `subscriptions` status values — `payments.status` already has
  `refunded` as a valid value per task 0008's original schema; refund
  just needs a trigger path to reach it).

### Feature behavior

1. **Push notifications** (backend feature `notifications` — **confirmed
   NOT an empty stub**: `notification_service.py` already defines
   `notify_new_like(profile_id)`, `notify_new_match(profile_id, match_id)`,
   `notify_new_message(profile_id, message_id)` as log-only stubs, and
   `fcm_client.FcmClient.send()` deliberately `raise`s
   `NotImplementedError`. **Critically, `notify_new_message` is already
   imported and called by `messaging/message_service.py`** (a real,
   working Wave-1 call site, wrapped in a try/except so the stub can
   never break a message send) — `notify_new_like`/`notify_new_match`
   exist but are **not called by anything yet**. B7 must *upgrade the
   existing functions in place* (same names, same module, same
   `profile_id`-based signatures — do not rename or change their
   signatures, since that would require editing `messaging/` to match,
   which is outside B7's owned paths) rather than add parallel new
   functions. Since push tokens/preferences are naturally per-`user_id`
   (device-level, not profile-level), resolve `profile_id -> user_id`
   internally via `Profile.user_id` inside each function.
   Add: device push-token register/unregister endpoints,
   notification-preferences get/update endpoints, and real delivery
   inside the existing three functions (token lookup + preference check +
   `FcmClient.send()`, now actually implemented instead of raising). Use
   the real `firebase-admin` SDK shape (don't invent a fake client
   contract) but with a stubbed/sandboxed service-account credential,
   clearly marked as sandbox-only — same spirit as the OTP-SMS and
   Razorpay stubs from prior waves; no real Firebase project keys this
   wave. Respect `notification_preferences` (skip sending if the user
   disabled that event type) — security alerts bypass preferences
   entirely. **B7 does not need to add a new-message call site (already
   exists) and does not add new-like/new-match/verification-result/
   subscription-activated call sites** (those remain integration-step-
   only, to avoid colliding with `likes`/`matches`/`verification`/
   `subscriptions` files this wave) — it only upgrades the three existing
   functions' internals and adds the token/preference plumbing around
   them.
2. **"See who liked you"** (extends backend `likes`): a
   `GET /likes/incoming` endpoint. Premium users get the full list
   (liker's profile summary + timestamp). Free users get a
   count-only/teaser response (no identities) — per
   `docs/product-plan.md` §Module 6: "Free users should not be given
   unrestricted access to the full incoming-likes list." Gate the
   full-detail branch behind `has_active_premium` (import from
   `features/subscriptions/subscriptions_service`, signature
   `has_active_premium(db, user_id)`).
3. **Payment history + refund workflow** (extends backend
   `subscriptions` for the self-service side, `admin` for the
   admin-triggered side): `GET /subscriptions/payments` (the
   authenticated user's own payment history, paginated or simple list is
   fine). Admin refund: `POST /admin/payments/{id}/refund` — sets that
   `Payment.status = "refunded"`; `Payment.subscription_id` (nullable FK,
   already in the schema) makes this well-defined, not ambiguous: if it
   is not null and that specific `Subscription.status == "active"`, set
   it to `"cancelled"` too (a refund revokes the entitlement *that
   specific payment* funded — don't guess at "the user's current
   subscription" generically, since a user can have had multiple
   subscriptions over time; use the FK). If `subscription_id` is null or
   that subscription is already expired/cancelled, just mark the payment
   refunded and do nothing else (no-op on the subscription side, not an
   error). Reuse the existing `require_admin` dependency.
4. **Marketing website content** (`apps/marketing-site`): **confirmed
   already partially built** — `src/app/page.tsx` (home, with `Hero`/
   `HowItWorks`), `src/app/pricing/page.tsx` (with `PricingTable`), and
   `src/app/faq/page.tsx` (with `FaqAccordion`) already exist and must
   NOT be recreated or restructured. The real remaining scope is only the
   pages Module 15 lists that don't exist yet: safety information,
   contact page, terms and conditions, privacy policy, community
   guidelines, account-deletion instructions, and app-download-links
   (placeholder links/badges are fine, no real store listings exist
   yet — these can live on the home page or a dedicated section, B9's
   call). `src/components/Header.tsx` currently links only to
   Home/Pricing/FAQ, and `src/components/Footer.tsx` has no links at
   all (just a copyright line) — B9 must add nav links for the new pages
   (Footer is the natural place to avoid crowding the header with 7+
   items, but this is B9's own call). Component-based, same rule as
   every other frontend in this repo. This is a separate Next.js app
   from admin-web — do not share components across them; copy patterns,
   don't cross-import.
5. **Admin-web: audit logs + refund UI** (extends `apps/admin-web`): an
   audit-log view (reads the new `admin_audit_log` table B8 is adding —
   **confirmed via reading `admin_service.py` that no audit-log
   mechanism exists anywhere today**, so this is a genuinely new
   capability, not an extension of something pre-existing), and a refund
   button added to the existing payments-monitoring view (item 3 above)
   calling the new `/admin/payments/{id}/refund` endpoint. **Basic
   analytics (city-wise registrations, DAU/WAU, discovery/engagement
   counts) is explicitly OUT of this wave's scope** — confirmed via
   reading `admin_service.py` that no backend analytics/aggregate-query
   endpoints exist, and no subtask in this wave's decomposition is
   assigned to build them; building a frontend analytics dashboard
   against a nonexistent backend contract would just produce dead UI.
   Defer analytics to a future wave with its own backend-owning subtask.

## Decomposition (parallel, disjoint)

1. **B7: push notifications infrastructure** — extends
   `services/backend/packages/api/features/notifications/**` only. Does
   not touch any other feature's files (no trigger-wiring this wave —
   integration step owns that).
2. **B8: likes visibility + payment history/refund** — extends
   `services/backend/packages/api/features/likes/**`,
   `services/backend/packages/api/features/subscriptions/**` (payment
   history endpoint only, not touching B7's or anyone else's files
   there), and `services/backend/packages/api/features/admin/**`
   (refund endpoint addition only). Also: audit the backend for whether
   any admin-action audit-log table/mechanism already exists; if not,
   add a minimal one (new `admin_audit_log` table + a
   `record_admin_action(db, admin_user_id, action, target_type,
   target_id)` helper, called from the refund endpoint and from existing
   admin actions you can reach without leaving your owned paths — if
   wiring it into other features' existing admin actions would require
   touching files outside your owned paths, report that as a flag for
   integration rather than doing it).
3. **B9: marketing website content** — `apps/marketing-site/**` only.
4. **M4: mobile push notifications + incoming likes** — new
   `apps/mobile/src/features/notifications/**` (FCM token registration
   via Expo's push-notification APIs, foreground/background handling,
   a notification-preferences screen), plus additive changes to
   `apps/mobile/src/features/likes/**` for an incoming-likes screen
   (Premium: full list; free: locked/teaser state linking to the
   subscriptions upsell screens from Wave 2).
5. **W3: admin-web audit logs + refund UI** — new
   `apps/admin-web/src/features/audit/**`, plus an additive refund
   button inside the existing `apps/admin-web/src/features/payments/**`
   view from Wave 2. (Analytics dropped from this wave's scope — see
   item 5 above.)

## Cross-feature contract notes (pre-decided to avoid repeat guessing)

- `has_active_premium(db, user_id)` — confirmed two-argument signature
  from Wave 2, import from
  `packages.api.features.subscriptions.subscriptions_service`.
- Notification event-type constants must be defined once, in B7's
  `features/notifications/` module (e.g. `EVENT_NEW_LIKE`,
  `EVENT_NEW_MATCH`, `EVENT_NEW_MESSAGE`, `EVENT_VERIFICATION_RESULT`,
  `EVENT_SUBSCRIPTION_ACTIVATED`, `EVENT_SECURITY_ALERT`) — the
  integration step imports these when wiring trigger calls, rather than
  each call site inventing its own string.
- `firebase-admin` is a new dependency — B7 must NOT add it to
  `requirements.txt` (integration-step-only, same rule as every prior
  wave); report the exact package/version needed instead.
- `expo-notifications` (or equivalent Expo push API) is a new mobile
  dependency — M4 may add it directly via `npx expo install` (mobile
  dependency additions have been done directly by implementing agents in
  prior waves, e.g. M3 added `expo-location` itself — this is consistent,
  unlike the backend `requirements.txt` convention which routes through
  integration).

## Validation step (completed — see below)

An independent agent reviewed this plan before dispatch — same bar as
tasks 0008/0010.

**Validator findings, fixed directly in this plan (this pass):**
1. `features/notifications/` was described too vaguely as "a stub
   directory... check its contents." Read in full: it already defines
   `notify_new_like`/`notify_new_match`/`notify_new_message` (log-only
   stubs) and a `FcmClient.send()` that raises `NotImplementedError` —
   and critically, **`notify_new_message` is already a live call site**
   inside `messaging/message_service.py` (Wave 1), while
   `notify_new_like`/`notify_new_match` are defined but called by
   nothing. Fixed: B7's brief now requires upgrading the existing three
   functions in place (same names/signatures) rather than adding
   parallel ones, and the "integration wires everything" framing was
   corrected — new-message needs no new wiring, only three events do.
2. Marketing site scope was written as if building every Module-15 page
   from scratch. Confirmed via directory listing that home/pricing/FAQ
   pages (with their components) already exist. Fixed: B9's scope
   narrowed to the genuinely missing pages (safety info, contact, terms,
   privacy, community guidelines, account-deletion, app-download-links)
   plus adding nav links, since `Footer.tsx` currently has none and
   `Header.tsx` only links to three existing pages.
3. Refund-vs-which-subscription was genuinely ambiguous as originally
   worded ("the user's currently-active subscription"). Fixed using the
   schema that already exists: `Payment.subscription_id` is a nullable
   FK, so the refund target is simply *that payment's own*
   `subscription_id`, conditionally cancelled only if still active — no
   guessing required.
4. W3's "basic analytics" item had no backend behind it — confirmed via
   reading `admin_service.py` that zero analytics/aggregate endpoints
   exist, and no subtask in this wave's decomposition was assigned to
   build any. Fixed: dropped analytics from this wave's scope entirely
   (deferred to a future wave with its own backend-owning subtask) so
   W3 isn't left building a dashboard against a nonexistent API.
5. Audit-log absence, confirmed definitively (not just "may not exist")
   by reading `admin_service.py` in full — no fix needed to the
   plan's own B8 approach, just tightened the risk-section wording from
   conditional to confirmed.

**Checked and confirmed fine, no changes needed:** `push_tokens`/
`notification_preferences` FKs align with the real `users` table;
`payments.status`'s existing `"refunded"` enum value is real and usable
as-is; B7/B8 owned-path disjointness holds against the real current
directory layout (no overlap found); M4's `notifications/**` (new) +
`likes/**` (additive) on mobile don't collide with anything else;
`has_active_premium(db, user_id)`'s two-arg signature is correctly
required for "who liked you"'s full-detail branch, and nothing else in
this wave needed gating that was missed; the dependency-routing
convention (`firebase-admin` integration-only, `expo-notifications`
direct-add by M4) is consistent with Wave 2's `expo-location` precedent.

## Risks

- **FCM without real credentials**: push notifications cannot be
  end-to-end live-verified against real devices this wave (no real
  Firebase project) — same structural limitation as Razorpay in Wave 2.
  Document clearly; this is a structural/schema+plumbing wave for
  notifications, not a verified-delivery one.
- **Trigger-wiring left to integration, with one exception**:
  `new_message` is already wired (Wave 1, `messaging/message_service.py`)
  and keeps working once B7 upgrades the function it calls — no
  integration action needed for that one. `new_like`, `new_match`,
  `verification_result`, and `subscription_activated` genuinely have no
  call site yet; the integration step must add all four. Flag this
  prominently so it isn't mistaken for "notifications are fully live"
  when B7 finishes — only new-message notifications will fire
  immediately after B7 + integration; the other three need the explicit
  wiring step too.
- **Audit log confirmed absent** (not just "may not exist" — verified by
  reading `admin_service.py`: no audit mechanism anywhere today). B8
  adds a minimal one scoped to what it can reach without touching other
  subtasks' files, and clearly flags any admin action it couldn't wire
  for integration to finish.
- **Analytics dropped from scope this wave**: no backend aggregate-query
  endpoints exist and no subtask here builds them — a future wave should
  pair a backend-analytics subtask with any admin-web analytics UI,
  rather than building a dashboard with nothing behind it.
- **Marketing website content is not legal advice**: terms/privacy/
  community-guidelines pages should be clearly structured placeholders
  reflecting `docs/product-plan.md`'s stated policy intentions, not a
  final legally-reviewed document — the product plan itself says to
  obtain real legal review before launch.

## Rollback

Each subtask confined to its own directories; integration commit is a
single revertible unit, consistent with every prior wave.
