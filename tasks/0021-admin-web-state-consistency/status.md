# Status: 0021-admin-web-state-consistency

**Current state:** done <!-- one of: planned | in-progress | verifying | done -->

## History

| Date | State | Notes |
|---|---|---|
| 2026-11-28 | planned | plan.md and ownership.md authored |
| 2026-11-28 | in-progress | Read authToken.ts, useAuth.ts, RequireAdminAuth.tsx, Sidebar.tsx. Confirmed RequireAdminAuth gates on `getAccessToken() !== null`. Grepped `style={{` across src/ — zero hits (no inline styles exist in this app). Beginning Zustand auth store implementation. |
| 2026-11-28 | verifying | Implemented `authStore.ts` (zustand, hydrated from `getAccessToken()` at module load), wired `useAuth.ts`'s `confirmOtp` and `RequireAdminAuth.tsx` through it, added `SidebarAuthAction.tsx` (Sign in / Sign out) composed into `Sidebar.tsx`, added `authStore.test.ts` (4 cases). Ran `npm run typecheck`, `npm run lint`, `npm test` (10 suites / 32 tests passed), `npm run build` (compiled, all 8 routes generated) — all green. |
| 2026-11-28 | done | Committed within owned paths and pushed to `main`. |

## Definition-of-done checklist

<!-- Copy from .claude/skills/task-pipeline/SKILL.md section 4; check off
     only after independently verifying, not on a subtask's say-so. -->

- [x] `npm run typecheck` green (no output, exit 0)
- [x] `npm run lint` green (`✔ No ESLint warnings or errors`)
- [x] `npm test` green (`Test Suites: 10 passed, 10 total`, `Tests: 32 passed, 32 total`, including the 4 new `authStore.test.ts` cases)
- [x] `npm run build` green (`✓ Compiled successfully`, all 8 routes generated; pre-existing Windows path-casing webpack cache warnings only, unrelated to this change)
- [x] New frontend UI is component-based (`SidebarAuthAction.tsx` is a single-responsibility component; `Sidebar.tsx` composes it rather than inlining the sign-in/out branch)
- [x] `plan.md` risk/rollback section matches what was actually built
- [x] Sidebar shows reactive Sign in / Sign out state driven by the auth store
- [x] RequireAdminAuth's exact existing gating behavior preserved, now via the store (see report)
- [x] Inline-style audit completed — result: zero `style={{` hits found in `src/` before or after this change; no conversions were needed
- [x] Committed and pushed to `main`

## Notes / deviations

- `src/lib/apiClient.ts` still calls `getAccessToken()` directly (for the
  `Authorization` header on each outgoing request). This was deliberately
  left alone: it's a non-reactive, per-request read in a plain fetch
  wrapper, not UI state that needs to re-render on change, so routing it
  through the Zustand store would add no behavior and only scope creep.
  `useAuth.ts` and `RequireAdminAuth.tsx` (the two call sites the task
  named) were migrated to the store as specified.
- Jest's `testEnvironment` for this app is `"node"` (no `jsdom`
  dependency installed), so `authStore.test.ts` mocks `@/lib/authToken`
  rather than exercising real `localStorage`, and uses
  `jest.resetModules()` + `require()` (not `import`, to avoid ts-jest's
  import-hoisting-vs-`jest.mock`-ordering pitfall) to get a fresh store
  module per test for the hydration-at-first-use cases.
- A pre-existing, unrelated Jest warning ("A worker process has failed to
  exit gracefully...") appears after the full suite run; it is a generic
  open-handle/leak notice from the test runner, not tied to any test
  failure (exit code 0, all 32 tests pass), and is not something this
  change introduced.
