# Ownership: 0009-fix-ec2-ecr-auth

Single sequential subtask.

| Subtask | Owned paths | Do-not-touch |
|---|---|---|
| ECR-auth fix agent | `infra/terraform/modules/iam/**` (ECR read policy addition only), `.github/workflows/deploy.yml` (ECR login step only — do not weaken the task-0007 hardening), live EC2 instance via SSM, `tasks/0009-fix-ec2-ecr-auth/**`, `tasks/0003`/`0004`/`0006`/`0007` status files (closing out once verified) | `services/**`, `apps/**`, `infra/docker-compose/**`, `infra/terraform/modules/ec2-app/**` (already fixed by task 0007 — do not touch), `lambda/**`, `.claude/**`, `docs/**` (except reading), `.github/workflows/ci.yml`, `tasks/0008-mvp-feature-completion/**` (separate, concurrently-running work — unrelated scope, do not touch) |

## Notes

- `tasks/0008-mvp-feature-completion`'s six implementation agents are
  running concurrently right now in `services/**` and `apps/**` — fully
  disjoint from this task's scope, no coordination needed.
- Fifth iteration of this same deploy-verification gate — maintain the
  same discipline: stop and report on a new distinct failure rather than
  guessing further.
