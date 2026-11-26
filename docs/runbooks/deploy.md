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
   - The backend Docker image is built and pushed to ECR.
   - `aws ssm send-command` is used to run, on the instance: pull the new
     image and restart the Docker Compose stack (`docker compose pull && docker compose up -d`
     or equivalent).
4. The workflow reports success/failure in the GitHub Actions run for that
   commit.

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
