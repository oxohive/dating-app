# Plan: 0021-admin-web-state-consistency

## Goal

Two things, confirmed live:

1. **Real bug**: the dashboard sidebar (`src/components/Sidebar.tsx`)
   always shows a "Sign in" link, even when the admin is already
   authenticated — because there is no reactive auth state anywhere in
   this app. Auth is tracked only via a raw `localStorage` wrapper
   (`src/lib/authToken.ts`), read ad-hoc wherever needed, with nothing
   subscribing to it reactively. `Sidebar.tsx`'s own docstring admits
   it's "purely presentational" and never checks auth state at all.
2. **User's explicit broader ask**: introduce Zustand as the single
   source of truth for cross-component app state (starting with auth,
   since that's the concrete bug — not a from-scratch invention), audit
   the app for inline styles (`style={{...}}`) and replace with Tailwind
   classes, and do a general consistency/production-readiness pass so
   state updates are correct everywhere and every visual element is a
   proper component, not ad-hoc JSX.

## Implementation

1. **Auth store (Zustand)**: new `src/features/auth/store/authStore.ts`
   holding `{ accessToken: string | null, isAuthenticated: boolean }`
   plus actions (`setAccessToken`, `clearAccessToken`) that also persist
   to `localStorage` (keep `src/lib/authToken.ts`'s localStorage
   mechanism underneath — don't lose the "survives a page refresh"
   behavior, just make it reactive on top: initialize the store's state
   from `getAccessToken()` once, and every subsequent change goes
   through the store, not raw `localStorage` calls scattered around).
   Update `useAuth.ts` to call the store's `setAccessToken` instead of
   the raw `lib/authToken.ts` function directly. Update
   `RequireAdminAuth.tsx` to read from the store instead of (or in
   addition to, if it needs the raw token value too) its current
   mechanism — check what it currently does first.
2. **Fix the real bug**: `Sidebar.tsx` reads `isAuthenticated` from the
   new store and renders either the "Sign in" link (not authenticated)
   or a "Sign out" action (authenticated) that calls the store's
   `clearAccessToken` and redirects to `/login` — matching what a
   logged-in admin should actually be able to do (there's currently no
   sign-out mechanism anywhere in the UI at all, a related gap worth
   closing in the same pass since it's the natural counterpart to this
   fix).
3. **Inline-style audit**: search the whole app
   (`grep -rn "style={{" src/`) and convert every hit to Tailwind
   utility classes (or a `className` prop on a shared component, if the
   style was parameterized/dynamic — e.g. a progress-bar width — use
   Tailwind's arbitrary-value syntax `w-[${pct}%]` or CSS custom
   properties rather than a raw inline `style` object, whichever fits
   each specific case). Don't change visual appearance, only the
   mechanism used to apply it.
4. **Component-consistency pass**: while doing the above, check for any
   other place that duplicates logic a shared component should own
   (e.g. two different ad-hoc "logged in / logged out" UI states if any
   exist beyond the sidebar) and consolidate — but keep this pass
   scoped to what's genuinely inconsistent, not a speculative rewrite of
   working, already-consistent code.
5. **Tests**: this app's existing convention is pure-function/logic
   tests (check `src/features/*/lib/*.test.ts` for the pattern) — add
   tests for the new store's state transitions (`setAccessToken` ->
   `isAuthenticated` becomes true, `clearAccessToken` -> false, initial
   hydration from an existing stored token) using the same convention.
6. **Verification**: `npm run typecheck`, `npm run lint`, `npm test`,
   `npm run build` all green. Then actually describe (can't click
   through live, but reason carefully from the code) the two states the
   sidebar now produces and confirm they're genuinely driven by real
   auth state, not still hardcoded.
7. Commit and push (triggers the normal CI/CD — admin-web is hosted on
   Vercel via its own Git integration, so this also auto-deploys there
   once merged to `main`; no AWS/infra step needed for this task).

## Risks

- Don't let "introduce Zustand" become scope creep into adding Zustand
  everywhere speculatively — start with auth (the concrete bug), and
  only extend to another piece of state if it's *already* duplicated/
  inconsistent in a way this pass naturally surfaces, not a hypothetical
  future need.
- `RequireAdminAuth.tsx`'s current mechanism must keep working for every
  existing gated page (users/reports/verification/payments/audit) — read
  it carefully before changing what it reads from, don't break the
  existing 403-to-sign-in-prompt behavior those pages rely on.

## Rollback

Revert the store/Sidebar/RequireAdminAuth changes; the raw
`localStorage` mechanism still exists underneath and nothing about the
backend changes, so this is a frontend-only, fully reversible change.

## What was actually built (post-implementation)

- `src/features/auth/store/authStore.ts`: new Zustand store
  (`zustand@^5.1.0`, added to `package.json`/`package-lock.json` -
  wasn't a dependency before). Hydrates `{ accessToken, isAuthenticated }`
  once from `getAccessToken()` at module load; `setAccessToken`/
  `clearAccessToken` persist through `src/lib/authToken.ts` underneath,
  same as the plan described.
- `useAuth.ts`'s `confirmOtp` and `RequireAdminAuth.tsx` now read/write
  through the store, as planned. `RequireAdminAuth.tsx` keeps its exact
  prior gating condition (token present vs. absent) and its
  mount-then-check pattern (render `null` until mounted, to avoid an
  SSR/client hydration mismatch) - only the source of truth changed, not
  the condition or the two-render-pass structure.
- `Sidebar.tsx`'s footer action was extracted into a new component,
  `src/components/SidebarAuthAction.tsx`, rather than inlined in
  `Sidebar.tsx` - this keeps `Sidebar.tsx` a pure composer (nav + auth
  action) and gives the new Sign in/Sign out logic its own
  single-responsibility file, per this repo's component-based UI
  convention. Not explicitly specified in the plan but a natural
  extension of it.
- Inline-style audit (`grep -rn "style={{" src/`): **zero hits**, before
  and after this change. No conversions were needed or made - noted
  rather than inventing changes.
- `src/lib/apiClient.ts` intentionally still calls `getAccessToken()`
  directly for its per-request `Authorization` header. This is a
  non-reactive read inside a plain fetch wrapper (not UI that needs to
  re-render), so it wasn't routed through the store - doing so would add
  no behavior and was out of the scope the plan named (`useAuth.ts` and
  `RequireAdminAuth.tsx` specifically).
- Tests: `src/features/auth/store/authStore.test.ts` (4 cases) added in
  this app's existing Jest convention. Since this app's Jest
  `testEnvironment` is `"node"` (no `jsdom` installed), the test mocks
  `@/lib/authToken` rather than real `localStorage`, and uses
  `jest.resetModules()` + `require()` per test to get a fresh store
  module for the hydration-at-first-use cases.
