# Ownership: 0005-idle-auto-shutdown

Single sequential subtask (Terraform composition, same reasoning as tasks
0002-0004).

| Subtask | Owned paths (write access) | Do-not-touch |
|---|---|---|
| Idle-shutdown agent | `lambda/env-wake/**` (new), `infra/terraform/envs/pilot/main.tf` (additive only), minimal additive changes inside `infra/terraform/modules/cloudwatch/**` or `infra/terraform/modules/env-scheduler/**` if needed (no unrelated edits), `docs/runbooks/env-start-stop.md`, `tasks/0005-idle-auto-shutdown/**` | `services/**`, `apps/**`, `infra/docker-compose/**`, `infra/terraform/modules/iam/**` (no trust-policy or deploy-role changes), `lambda/env-start/**` and `lambda/env-stop/**` (reuse as-is, do not modify their handlers), `.claude/**`, other `docs/**`, `.github/workflows/**`, other `tasks/*` |

## Notes

- `lambda/env-stop` is reused unmodified as the alarm's target — this task
  only adds the alarm + permission that invokes it, it does not change that
  function's code.
- Do not build a new reverse proxy, CloudFront distribution, or domain —
  out of scope; the wake mechanism is a standalone small Lambda + Function
  URL only.
