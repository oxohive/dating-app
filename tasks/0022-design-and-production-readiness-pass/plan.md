# Plan: 0022-design-and-production-readiness-pass

## Goal

A thorough design-quality and production-readiness pass across all
three frontends (marketing-site, admin-web, mobile), applying the
substance the user asked for (premium visual design, strong typography/
hierarchy, avoiding a generic AI-template look, accessibility,
component-architecture cleanliness, animation/interaction polish, and
React-Native-specific performance/UI practices for mobile) — not a
cosmetic reskin, a genuine audit-and-fix pass. Same plan → validate →
parallel implement → integrate → validate-again cycle as every prior
wave this session.

## Scope per app

### Marketing-site (`apps/marketing-site`)
- **CONFIRMED, concrete, highest-priority bug** (read directly,
  2026-11-28): `src/features/home/components/Hero.tsx` lines 29-30 ship
  literal placeholder copy as live homepage body text: *"Lorem ipsum
  dolor sit amet, consectetur adipiscing elit. Meet verified singles
  near you."* This is not a vague "feels generic" critique — it's
  actual unfinished placeholder text in production. Fix this specific
  copy, and grep the rest of the app for `lorem ipsum`/`Lorem Ipsum`
  (case-insensitive) to catch any other instance before calling this
  done.
- **CONFIRMED, concrete accessibility bug** (computed real WCAG
  contrast ratios against `tailwind.config.js`'s actual color values,
  not estimated): `text-neutral-400` (`#a9a4b0`) on near-white
  backgrounds computes to **2.44:1**, failing WCAG AA (needs 3:1 for
  large/UI text, 4.5:1 for body text) at its two real, confirmed usage
  sites:
  - `src/features/home/components/AppDownloadBadges.tsx:39`
  - `src/features/pricing/components/PricingTable.tsx:45` (the "/mo"
    price-suffix text — directly relevant to a purchase decision)

  Fix: bump both to `text-neutral-500` (`#7d7786`) or darker — recompute
  the actual resulting ratio against the real background color at each
  site before calling it fixed, don't just swap and assume.
  **Confirmed fine, no change needed**: `primary-600` text on white
  (4.52:1, passes AA), `neutral-600` on white (7.07:1), `neutral-900` on
  white (17.23:1), white text on `primary-600` background (4.52:1).
- "Generic AI-template" concern: the coral-gradient-hero + card-grid
  pattern is a known default look, but the concrete, fixable instance of
  this is the Lorem-ipsum bug above, not a wholesale redesign. Beyond
  that specific fix, look for genuinely distinctive touches
  opportunistically (asymmetry, a point of view in the copy) but do not
  treat "make it feel less generic" as license for a broad visual
  rewrite — anchor any further change to something concrete you can
  name, the same way the two bugs above are concrete.
- Semantic HTML / heading order / landmark regions: verify (read the
  actual page components), don't assume broken.
- Responsive/mobile excellence (this is a dating app — mobile traffic
  dominates): test narrow-viewport layouts for every page, not just
  home.
- Animation/interaction polish: hover/focus/active states on every
  interactive element — note `Button.tsx`/nav links were not read in
  this validation pass, so verify their current state before assuming
  they're missing.

### Admin-web (`apps/admin-web`)
- **CORRECTION (read directly — the plan's original assumption here was
  wrong, do not have the implementing agent go hunting for a problem
  that isn't there)**: `Button.tsx`, `Badge.tsx`, `StatusFilter.tsx`,
  `Sidebar.tsx`'s nav, and `RefundAction.tsx`'s two-step confirm are
  **already** shared, single-responsibility primitives with no
  duplication found — `Badge` already pairs every status tone with both
  a distinct color *and* a distinct icon (explicitly for colorblind
  users, per its own comment), `StatusFilter` is a native `<select>`
  (inherently keyboard-accessible, no custom ARIA needed), `Button` is a
  native `<button>` with `focus-visible:ring-*` already on every variant,
  nav items are native `<Link>` anchors. **Do not add ARIA roles to
  already-accessible native elements** — that's adding noise, not fixing
  a gap. The real task here is verification (confirm this holds across
  every page, not just the ones read in this validation pass) plus
  fixing anything genuinely missing you find during that verification,
  not assuming a problem exists before looking.
- Keyboard navigation / focus management: verify end-to-end (tab order
  through a full table + the refund confirm flow), since the pieces
  being accessible individually doesn't guarantee the composed flow is.
- Information density vs. clarity balance: dashboards should feel like
  Linear/Stripe-caliber — check real spacing/alignment consistency
  across every page (Users/Reports/Verification/Payments/Audit log),
  not just the ones built most recently.
- Empty/loading/error states: confirm every list view has a real
  loading state (not just empty-until-data), not only an empty-state
  message.

### Mobile (`apps/mobile`)
- **CORRECTION (verified directly — narrow the theme-consistency item,
  the plan's original framing overstated it)**: a repo-wide search for
  raw hex colors outside `core/theme.ts` found exactly 3 files
  (`components/Button.tsx`, `features/messaging/components/
  MessageBubble.tsx`, `features/safety/components/
  ReportReasonPicker.tsx`), and all three are the single reasonable case
  of `color: '#FFFFFF'` for text/icon color against a colored
  background (not a meaningful inconsistency — `theme.ts` has no "pure
  white" token to begin with, since `colors.background` means page
  background, not "white text"). **There is no real Wave-1-vs-later
  theme drift** — drop this as a scope item; if the implementing agent
  wants to add a `colors.onPrimary` / `colors.white` token for these 3
  call sites for cleanliness, that's a reasonable small nice-to-have,
  not a bug fix.
- React Native / Expo performance practices: 6 real `FlatList` usages
  confirmed (`likes/IncomingLikesScreen`, `notifications/
  NotificationPreferencesScreen`, `subscriptions/PlansScreen`,
  `messaging/ConversationScreen`, `matches/MatchesScreen`, `messaging/
  InboxScreen`) — check each for `keyExtractor`, inline
  function/object literals recreated every render for `renderItem`,
  missing `useCallback`/`useMemo` where it matters. This item is real
  and grounded; the original framing was directionally correct.
- Accessibility: `LoginForm.tsx` already has `accessibilityLabel="Phone
  number"` on its `TextInput` (some baseline exists) — verify this
  pattern is actually consistent across every interactive element in
  every screen, not just this one, and check touch-target sizes
  (44x44pt minimum) and dynamic-type/font-scaling behavior.
- Animation/interaction polish: verify whether the wake-up screen's
  (task 0018) level of care extends to swipe/discovery, like, match
  celebration, message send — not yet checked in this validation pass.
- **"Single phone number things" — CONFIRMED real and scoped**: read
  `LoginForm.tsx` directly — it's a single bare `TextInput` with
  `keyboardType="phone-pad"` and a placeholder hint
  (`"+91 90000 00000"`), no country-code picker, no live format-as-you-
  type feedback. Validation only surfaces as a generic error after
  submit (via `isLikelyValidPhoneNumber`, not checked in this pass —
  read it before changing the validation UX, not just the input field).

## Decomposition (parallel, disjoint)

1. **Marketing-site design/a11y/polish pass** — `apps/marketing-site/**`.
2. **Admin-web design/a11y/polish pass** — `apps/admin-web/**`.
3. **Mobile design/a11y/performance pass** — `apps/mobile/**`.

Fully disjoint app boundaries, safe in parallel.

## Validation step (completed 2026-11-28)

**Verdict: plan was not ready as-written — every scope item has now
been individually verified against the real codebase, with 2 concrete
bugs confirmed (marketing-site Lorem-ipsum copy, 2 real WCAG-AA contrast
failures with computed ratios), 2 scope items substantially corrected/
narrowed because the original assumption didn't hold (admin-web's
"missing ARIA"/duplication concern, mobile's "theme drift" concern), and
1 item confirmed accurate as originally framed (mobile's phone-number
input, mobile's real FlatList inventory). The scope-items sections above
are the corrected, ready-to-implement version — ready for three-way
parallel dispatch.**

Owned-path disjointness re-confirmed: all three subtasks map to whole-
app directory boundaries (`apps/marketing-site/**`,
`apps/admin-web/**`, `apps/mobile/**`) with no shared config file or
cross-app dependency — trivially disjoint, no change needed in
`ownership.md`.

After implementation: each subtask's own report must still be
independently spot-checked (read the actual diffs, don't trust claims)
before being folded into this task's final status, same discipline as
every prior wave's integration step — this validation pass only confirms
the plan is well-grounded, not that the eventual implementation will be.

## Risks

- "Make everything unique" is a soft, subjective goal — anchor fixes to
  concrete, defensible criteria (contrast ratios, touch-target sizes,
  consistent token usage, specific generic-pattern call-outs) rather
  than purely aesthetic opinion. This validation pass deliberately
  replaced every originally-speculative scope item above with a
  concretely-verified one (or an explicit correction/removal where the
  original assumption didn't hold) for exactly this reason — the
  implementing agents should treat the confirmed items above as the
  real work, not re-derive or second-guess them, and should hold any
  *new* finding they make themselves to the same "name the specific
  file/line/ratio" bar before acting on it.
- **Scope is explicitly a polish/fix/accessibility pass on existing
  screens, not new product features.** The user's own request used the
  phrase "full feature implementation," which could be misread as
  license to build net-new functionality — it is NOT: nothing in this
  task's scope (above) describes a feature that doesn't already exist.
  If an implementing agent believes a genuinely new feature is needed
  to achieve "production readiness," it must flag that in its report
  rather than build it — that's a separate, future wave's decision, not
  this task's.
- Do not fix things that validation confirmed are already correct
  (admin-web's component primitives, mobile's theme consistency,
  marketing-site's non-Lorem-ipsum contrast pairings) — churning
  working code adds risk with no benefit and contradicts this plan's
  own evidence.

## Rollback

Each subtask confined to its own app; revert any one app's commit
independently if a specific change is unwanted.
