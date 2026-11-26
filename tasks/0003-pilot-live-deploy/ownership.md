# Ownership: 0003-pilot-live-deploy

Single sequential subtask — no parallel dispatch (every step depends on the
previous step's real output, same reasoning as task 0002).

| Subtask | Owned paths (write access) | Do-not-touch |
|---|---|---|
| Live-deploy agent | `infra/docker-compose/**` (new), `.github/workflows/deploy.yml` (deploy job steps only), `infra/terraform/envs/pilot/main.tf` (additive only — one new `aws_iam_role_policy` resource, no edits to existing resources), one new AWS SSM parameter, `tasks/0003-pilot-live-deploy/**`, the pending local commits already in the working tree (may commit/push them as part of this task's commit sequence) | `services/backend/**` application code, `apps/**`, `infra/terraform/modules/**`, `lambda/**`, `.claude/**`, `docs/**` (except reading), `.github/workflows/ci.yml` and `deploy.yml`'s `check-ready`/`deploy-skipped` jobs, any other `tasks/*` folder |

## Notes

- This agent may `git push` to `origin/main` — unlike task 0002, pushing is
  the explicit point of this task (it's the deploy trigger). Task 0002
  deliberately stopped short of pushing; this task does not.
- Do not modify `infra/terraform/modules/**` — the IAM addition is a new
  composition-layer resource in `envs/pilot/main.tf`, not a module change.
- Do not touch the DB password value anywhere except: generating it once,
  storing it in SSM, and rendering it into an ephemeral, never-committed
  `.env.pilot` at deploy time.
