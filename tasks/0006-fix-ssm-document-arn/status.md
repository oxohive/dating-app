# Status: 0006-fix-ssm-document-arn

**State:** blocked (this task's own fix is done, verified, and shipped —
but the same deploy chain hit a third, different, pre-existing bug on the
EC2 instance itself: the AWS CLI is not installed there, so the SSM deploy
script's `aws s3 sync` step fails and the compose stack never actually
starts, even though the GitHub Actions step and the SSM command both
report "success")

## What was fixed and verified

- `infra/terraform/modules/iam/main.tf`, `data.aws_iam_policy_document.gha_deploy`,
  `SsmSendCommandDocument` statement: resource ARN changed from
  `arn:${partition}:ssm:*:${account_id}:document/AWS-RunShellScript` to
  `arn:${partition}:ssm:*::document/AWS-RunShellScript` (dropped the
  account-ID segment — `AWS-RunShellScript` is Amazon-owned, confirmed via
  `aws ssm describe-document --name AWS-RunShellScript` showing
  `Owner: Amazon`). The sibling `SsmSendCommandToPilotInstance` statement
  (granting `ssm:SendCommand` on the actual instance ARN) was already
  correct and left untouched.
- `terraform plan` in `infra/terraform/envs/pilot`: exactly
  `0 to add, 1 to change, 0 to destroy` (only `module.iam.aws_iam_role_policy.gha_deploy`,
  only the one `Resource` string inside it).
- `terraform apply`: applied cleanly, confirmed in the plan/apply output
  (`Resources: 0 added, 1 changed, 0 destroyed`).
- Re-ran the latest `Deploy` run (`gh run rerun 45898188301`, same commit
  `b325975`) and watched it to completion: **it went fully green**,
  including "Pull and restart Docker Compose stack on instance", which
  previously failed with `AccessDeniedException` on `ssm:SendCommand`.
  Confirmed via `aws ssm list-commands` on the instance that the deploy's
  SSM command (`8224b2b8-...`) was no longer denied — it was actually
  accepted and ran this time. **The ARN fix itself is confirmed working.**

## New blocker found (third, different, pre-existing bug — not patched here)

Despite the GitHub Actions job and the SSM command both reporting success,
the deploy did not actually happen:

- `curl http://13.203.80.98/health` → connection refused (nothing listening
  on port 80).
- `docker ps -a` on the instance via SSM → empty, no containers at all.
- `/opt/dating-app` on the instance only contains a `bootstrap.done` marker
  file — no `docker-compose.pilot.yml`, no `.env.pilot`.
- The deploy SSM command's own invocation output
  (`aws ssm get-command-invocation --command-id 8224b2b8-...`) shows
  `ResponseCode: 0` / `Status: Success`, but its `StandardErrorContent` is:

      _script.sh: 2: aws: not found
      couldn't find env file: /opt/dating-app/.env.pilot
      couldn't find env file: /opt/dating-app/.env.pilot

  i.e. the instance has no AWS CLI installed, so `aws s3 sync
  s3://.../deploy/ /opt/dating-app/` (the step that stages the compose
  file, nginx conf, and rendered `.env.pilot` onto the instance) fails
  immediately with "command not found". The subsequent `docker compose ...
  pull`/`up -d` calls then fail too (no compose file, no env file on disk).
  The overall SSM command still reports `Success` because
  `AWS-RunShellScript` runs each listed command in sequence without
  aborting on a failed one, and the *last* command in the list
  (`docker image prune -f`) succeeds on its own, so the command's final
  exit code is 0 — masking every real failure before it. This is why both
  GitHub Actions and plain `get-command-invocation` status checks showed
  green/Success even though nothing was actually deployed.
- Confirmed directly: `which aws` on the instance → not found.

This is a distinct bug from the one this task was chartered to fix (an IAM
permissions ARN typo) — it's a missing dependency on the EC2 instance's
AMI/bootstrap (no AWS CLI), plus a latent issue in `deploy.yml`'s SSM
script that it doesn't check per-command exit status, so failures there
are silently swallowed. Per this task's own instructions ("if it fails
again with yet another distinct error, do not guess-patch further"), this
is reported rather than patched blind. Needs a new task to: (a) install
the AWS CLI on the pilot instance (via user-data/bootstrap script or AMI
change), and (b) likely harden the `deploy.yml` SSM script to fail loudly
(e.g. `set -e` equivalent / checking each command's exit code) instead of
reporting false success.

## Definition-of-done checklist

- [x] `SsmSendCommandDocument` resource ARN fixed (account-ID segment
      dropped for the Amazon-owned public document)
- [x] `terraform plan` showed only this one resource changing
- [x] `terraform apply` completed
- [x] Deploy re-triggered and watched to completion, green (GitHub Actions
      reported success — but see new blocker above: green does not mean
      live)
- [ ] `/health` confirmed reachable on the instance's public IP — **not
      reachable**, connection refused; blocked on the new AWS-CLI-missing
      bug above
- [ ] `docker compose ps` confirms all 5 services up — **not even
      attempted on the instance**; zero containers exist, no compose file
      was ever staged there
- [ ] `tasks/0003-pilot-live-deploy/status.md` and
      `tasks/0004-fix-oidc-trust-policy/status.md` closed to `done` — **not
      done**; liveness still isn't real, so neither task's checklist is
      actually complete. Left as-is (still `blocked`), not flipped.

This task's own fix (the SSM document ARN) is done and verified working.
Cannot move this task to `done` either, since its own stated goal ("get
the pilot deploy to actually complete and verify liveness") is not yet
achieved — a third, different, pre-existing bug blocks it. Needs a new
follow-up task (recommend `0007-install-aws-cli-on-pilot-instance` or
similar) to fix the instance bootstrap and, ideally, the silent-failure
gap in `deploy.yml`'s SSM step.

**Update (task 0007):** the AWS-CLI-missing bug and deploy.yml's
silent-failure masking have both been fixed and verified — `aws s3 sync`
now succeeds on the instance, deploy assets are correctly staged under
`/opt/dating-app`, and the deploy job now correctly fails loudly instead
of reporting false "Success" when something really breaks. This task's own
SSM-document-ARN fix remains confirmed working throughout. The chain is
now blocked on a **fourth** bug: the EC2 instance's Docker daemon isn't
authenticated to ECR, so pulling the private backend image fails (`no
basic auth credentials`) — see
`tasks/0007-fix-instance-bootstrap-and-deploy-verification/status.md`.
Still leaving this task as `blocked`, not `done`; the pilot isn't live
yet.
