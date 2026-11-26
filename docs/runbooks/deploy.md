# Runbook: Deploy

Deploys to the AWS pilot are **automatic on merge to `main`**. There is no
manual deploy step, and no one should SSH into the pilot instance to push
code by hand — see `docs/architecture/overview.md` and
`.claude/skills/task-pipeline/SKILL.md` section 5 for why.

## What actually happens on merge to `main`

1. A PR merges into `main`, which triggers
   `.github/workflows/deploy.yml` (it also supports manual
   `workflow_dispatch` for re-running the same pipeline on demand, not for
   bypassing it).
2. **`check-ready` job** checks whether the AWS deploy secrets/vars exist
   (`secrets.AWS_DEPLOY_ROLE_ARN`, `vars.EC2_INSTANCE_ID`, and related ECR
   settings). If they're missing — e.g. the AWS pilot infra task hasn't run
   yet — the workflow logs that infra isn't provisioned and **exits
   successfully without deploying**. This is expected during early repo
   bootstrap and is not a failure.
3. If secrets/vars are present:
   - The job authenticates to AWS via GitHub OIDC
     (`aws-actions/configure-aws-credentials`, assuming
     `AWS_DEPLOY_ROLE_ARN`). No static AWS keys are ever used.
   - If the pilot EC2 instance is stopped, it's started
     (`aws ec2 start-instances`) and the workflow waits for it to reach
     `running`.
   - The backend Docker image is built from `services/backend/deploy/Dockerfile`
     and pushed to ECR, tagged with both the commit SHA (`IMAGE_TAG`,
     immutable — this is what actually gets deployed) and `latest`.
   - The pilot DB password is fetched from AWS SSM Parameter Store
     (`/dating-app/pilot/db_password`, a `SecureString`) and masked in the
     job log (`::add-mask::`) — it is never stored in the repo or in GitHub
     secrets.
   - A runtime-only `.env.pilot` file is rendered on the runner (under
     `$RUNNER_TEMP`, never committed) containing `POSTGRES_DB`/
     `POSTGRES_USER`/`POSTGRES_PASSWORD`, `DATABASE_URL`, `REDIS_URL`, and
     `BACKEND_IMAGE` (the exact sha-tagged ECR image just built/pushed).
   - That `.env.pilot`, plus the committed
     `infra/docker-compose/docker-compose.pilot.yml` and
     `infra/docker-compose/nginx.conf`, are uploaded to
     `s3://oxohive-dating-app-pilot-artifacts-767398004313/deploy/`.
   - `aws ssm send-command` runs on the instance: `aws s3 sync` that
     `deploy/` prefix down to `/opt/dating-app`, then
     `docker compose -f docker-compose.pilot.yml --env-file .env.pilot pull`
     followed by `up -d`, then `docker image prune -f`.
4. The workflow reports success/failure in the GitHub Actions run for that
   commit.

### Deploy assets live in S3, not git

Unlike a typical git-based deploy, the instance never does a `git pull` and
there is no `docker-compose.yml` committed directly to `/opt/dating-app` by
hand. The authoritative compose stack and nginx config are the committed
files under `infra/docker-compose/`; the CI job is what gets them (plus the
per-deploy secrets/image tag) onto the instance, via S3 as the hand-off
point. To inspect what's actually running, SSM into the instance and look
at `/opt/dating-app` (synced from S3 on every deploy) — do not expect to
find it by looking at a git checkout on the box.

The one secret in this pipeline — the pilot Postgres password — exists only
as an AWS SSM `SecureString` parameter
(`/dating-app/pilot/db_password`) and in the ephemeral `.env.pilot` rendered
per-run; it is deliberately never committed or printed in logs.

## Before merging

- CI (`ci.yml`) must be green on the PR.
- The task's `status.md` (see `.claude/skills/task-pipeline/SKILL.md`)
  should be at `verifying` or `done` before the PR merges — don't merge
  work that hasn't passed its own definition of done.

## If a deploy run fails partway

- Check the Actions run logs for the failing step (EC2 start, ECR push, or
  SSM command).
- The instance may be left running even if a later step failed — that's
  fine, the auto-stop schedule (see `env-start-stop.md`) will still apply
  later, or you can stop it manually if you want to fully reset state.
- Do not SSH in to "fix" the running containers by hand. Fix the underlying
  cause (code, Dockerfile, SSM command) and re-merge, or re-run the workflow
  via `workflow_dispatch` once the fix is in `main`.
- If the deploy broke the running service, go to `docs/runbooks/rollback.md`.
