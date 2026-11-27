# Ownership: 0018-mobile-dynamic-wake-discovery

Two concurrently-running subtasks, disjoint paths.

| Subtask | Owned paths | Do-not-touch |
|---|---|---|
| Infra | `lambda/env-wake/**`, `infra/terraform/envs/pilot/**`, `docs/runbooks/env-start-stop.md` | `apps/mobile/**` except checking for (and only touching if genuinely necessary, coordinating via report) a hardcoded static-IP config value |
| Mobile | `apps/mobile/**` | backend, infra, admin-web, marketing-site |

Both must treat the JSON contract in `plan.md` as fixed — do not deviate
from the exact field names/states without updating the other side too
(there is no integration step planned for this task beyond a final
cross-check, since the contract is pinned up front).
