# Ownership: 0023-account-deletion-and-admin-analytics

Four concurrently-running subtasks, disjoint paths.

| Subtask | Owned paths | Do-not-touch |
|---|---|---|
| B1: account deletion | `services/backend/packages/api/features/auth/**`, `services/backend/packages/api/features/profiles/**` (PII-scrub only) | `features/admin/**` (read-only — may read `admin_service.py` to check the suspend-vs-delete question, must not write to it), `features/matches/**`/`features/messaging/**` (read-only, to confirm rendering safety — flag any real fix needed rather than editing those features directly, since they're outside this subtask's owned paths) |
| B2: admin analytics | `services/backend/packages/api/features/admin/**` only | everything else |
| M1: mobile account-deletion UI | `apps/mobile/src/features/profile/**` (entry point only, additive), `apps/mobile/src/features/account/**` (new, or existing if already present — check first) | backend, admin-web, marketing-site |
| W1: admin-web Dashboard | `apps/admin-web/src/app/page.tsx`, `apps/admin-web/src/features/dashboard/**` (new) | everything else |

B1 and B2 both touch `features/admin/**` conceptually — B1 is read-only
there, B2 owns all writes. If B1 finds a genuine fix needed in
`matches`/`messaging` rendering, it must flag this for the integration
step rather than editing those files itself.

A validator agent reviews `plan.md` before dispatch.
