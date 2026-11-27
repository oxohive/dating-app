# Ownership: 0022-design-and-production-readiness-pass

Three concurrently-running subtasks, disjoint paths.

| Subtask | Owned paths |
|---|---|
| Marketing-site pass | `apps/marketing-site/**` |
| Admin-web pass | `apps/admin-web/**` |
| Mobile pass | `apps/mobile/**` |

No shared files between them. A validator agent reviews `plan.md` before
dispatch; an integration/spot-check pass reviews all three after.
