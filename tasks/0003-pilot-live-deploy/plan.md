# Plan: 0003-pilot-live-deploy

## Goal

Make the dating-app backend actually reachable and running on the
provisioned pilot EC2 instance (`i-0d1b0c7d979b384f5`). Task 0002 provisioned
the AWS resources (EC2, ECR, S3, IAM/OIDC, CloudWatch) and wired GitHub
secrets/vars, but `deploy.yml`'s deploy job assumes a Docker Compose stack
already exists at `/opt/dating-app` on the instance — nothing has ever put
one there. `terraform`'s `user_data` only installs Docker; no
`docker-compose.yml` exists anywhere in this repo yet. This task closes that
gap end-to-end and confirms the app actually answers requests.

## Approach

One sequential agent (same reasoning as task 0002 — bootstrapping deploy
assets, the IAM policy addition, and the live verification all hard-depend
on each other's output in order):

1. Author `infra/docker-compose/docker-compose.pilot.yml` (postgres/postgis,
   redis, backend, celery-worker, nginx) and `infra/docker-compose/nginx.conf`
   (reverse proxy `/` → `backend:8000`). Backend/celery-worker images come
   from `${BACKEND_IMAGE}` (the immutable per-sha ECR tag the deploy job
   already pushes), not `latest`.
2. Generate a pilot DB password once, store it as an AWS SSM SecureString
   parameter (not committed anywhere) — this is the one secret the deploy
   job needs to render into a runtime `.env.pilot` file.
3. Extend `deploy.yml`'s deploy job: fetch that SSM parameter, render
   `.env.pilot` on the runner (ephemeral, never committed), upload the three
   deploy assets (compose file, nginx conf, env file) to the existing
   artifacts S3 bucket under a `deploy/` prefix, then change the SSM
   "Pull and restart" step to `aws s3 sync` those assets onto the instance
   before running `docker compose ... pull && up -d`.
4. Grant the EC2 instance role `s3:GetObject`/`s3:ListBucket` on the
   artifacts bucket (it currently isn't granted — the `iam` module only
   scoped media/backup buckets) via a small additional
   `aws_iam_role_policy` in `infra/terraform/envs/pilot/main.tf`, applied
   with `terraform apply -target` (not a module edit).
5. Commit everything (including the two already-pending local commits from
   task 0002 / the `.gitignore` fix, and the task 0002 status.md edit
   already in the working tree) and push to `main` — this is the actual
   trigger for `deploy.yml` to build the backend image, push it to ECR, and
   run the new deploy steps for real.
6. Watch that specific Actions run to completion, then independently verify
   liveness: `curl` the instance's public IP's `/health` endpoint, and check
   container status on the instance via SSM (`docker compose ps`) to confirm
   postgres/redis/backend/celery-worker/nginx are all up.

## Files / directories touched

- `infra/docker-compose/docker-compose.pilot.yml`, `infra/docker-compose/nginx.conf`
- `.github/workflows/deploy.yml` (deploy job steps only — not `check-ready`/`ci.yml`)
- `infra/terraform/envs/pilot/main.tf` (one new `aws_iam_role_policy` resource)
- One new AWS SSM SecureString parameter (not a repo file)
- `tasks/0003-pilot-live-deploy/**`
- A `git push` to `origin/main` (the actual deploy trigger)

Everything else (`services/backend/**` application code, `apps/**`,
`infra/terraform/modules/**`, other `tasks/*`) is out of scope.

## Risks

- **This push deploys for real** against a live, billed instance — mitigated
  by everything up to this point (docker-compose authoring, IAM change,
  workflow edit) being reviewable before the push happens, and by the agent
  watching the resulting Actions run rather than assuming success.
- **First-ever `docker compose up` on this instance** may be slow (image
  pulls, Postgres init) — mitigated by the agent polling/waiting rather than
  checking liveness too early.
- **IAM policy addition is scoped narrowly** (read-only S3 access to one
  bucket prefix) to avoid widening the instance's permissions beyond what's
  needed.
- **DB password exists only in SSM**, never in git — mitigated by rendering
  `.env.pilot` only at deploy time on the runner, never committing it.

## Rollback

- `deploy.yml` changes and the compose/nginx files can be reverted with a
  normal `git revert` per `docs/runbooks/rollback.md`.
- The IAM policy addition can be removed via `terraform destroy -target` on
  that specific resource if it needs to be undone independently.
- If the live deploy itself is bad, the existing pilot runbook
  (`docs/runbooks/rollback.md`) covers reverting to a prior image tag via
  the same SSM-based mechanism.
