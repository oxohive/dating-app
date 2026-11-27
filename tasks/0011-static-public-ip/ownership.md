# Ownership: 0011-static-public-ip

Single sequential agent — real AWS infra changes via Terraform, same
pattern as tasks 0002/0005. No parallel decomposition needed for a
one-resource change.

| Owned paths |
|---|
| `infra/terraform/envs/pilot/**`, `infra/terraform/modules/ec2-app/**` (only if the EIP is placed inside the module instead of the env composition layer) |
| `docs/runbooks/env-start-stop.md` |
| `tasks/0011-static-public-ip/**` |

No other task is running against `infra/terraform/**` concurrently with
this one — safe to run now in parallel with Wave 2's integration/deploy
(which only touches `services/backend`, `apps/*`, `.github/workflows`,
`db/migrations`) and Wave 3 planning (no file writes yet).
