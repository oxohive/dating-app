# Plan: 0007-fix-instance-bootstrap-and-deploy-verification

## Goal

Fix the third distinct bug found in the deploy chain (0002→0003→0004→0006):
the pilot EC2 instance has no AWS CLI installed, so the deploy's
`aws s3 sync` staging step fails immediately — and `deploy.yml`'s SSM script
masks that failure as "success" because `AWS-RunShellScript` doesn't abort
on a failed command and the last command in the list happens to succeed on
its own. Fix both the immediate blocker and the silent-failure design flaw,
then get the pilot genuinely live and verified.

## Approach

Single sequential agent (same reasoning as 0002/0004/0006 — each step's
output gates the next).

1. **Hot-patch the live instance now** (fastest unblock, no instance
   replacement risk): via SSM `AWS-RunShellScript`, install AWS CLI v2 on
   `i-0d1b0c7d979b384f5` directly (standard: download the official zip,
   unzip, run its installer). Verify with `which aws` / `aws --version` via
   a follow-up SSM command.
2. **Fix the root cause for the future**: update
   `infra/terraform/modules/ec2-app`'s `user_data` template to install the
   AWS CLI on boot, so any future replacement instance has it baked in.
   **Before applying**, run `terraform plan` and check specifically whether
   this change forces replacement of the live running instance (`user_data`
   is normally a force-new attribute on `aws_instance`). If it does, DO NOT
   apply a change that replaces the live instance — instead add
   `lifecycle { ignore_changes = [user_data] }` (or equivalent) so the
   committed template is correct for the future without disrupting the
   current instance, and note clearly in the report that the live instance
   was fixed via the step-1 hot-patch, not via this Terraform change.
3. **Harden `deploy.yml`'s deploy job** so failures can never again report
   as false success: change the SSM script to fail fast (e.g. prefix with
   `set -e`, or check each command's own exit status and abort), AND add an
   explicit check in the GitHub Actions step after
   `aws ssm get-command-invocation` that reads the invocation `Status` field
   and fails the job (non-zero exit) if it isn't `Success` — don't rely on
   the wrapper command's own exit code alone.
4. `terraform plan`/`apply` for step 2's change (confirmed non-disruptive
   per the check above).
5. Commit the `deploy.yml` + `ec2-app` module changes, push.
6. Re-trigger `Deploy`, watch to completion. Independently verify (don't
   trust the workflow's own "green" status alone, given the history here):
   `curl /health` on the instance's public IP, and `docker compose ps` via
   SSM showing all 5 services running.
7. Close out `tasks/0003-pilot-live-deploy/status.md`,
   `tasks/0004-fix-oidc-trust-policy/status.md`, and
   `tasks/0006-fix-ssm-document-arn/status.md` to `done` — but only once
   every one of their own checklist items is genuinely, independently true.

## Files / directories touched

- `infra/terraform/modules/ec2-app/**` (user_data template; `main.tf`
  lifecycle block if needed to avoid forced replacement)
- `.github/workflows/deploy.yml` (deploy job's SSM script + verification step)
- Live SSM command against the instance (not a repo file)
- `tasks/0007-fix-instance-bootstrap-and-deploy-verification/**`
- `tasks/0003-pilot-live-deploy/status.md`,
  `tasks/0004-fix-oidc-trust-policy/status.md`,
  `tasks/0006-fix-ssm-document-arn/status.md` (closing out, once verified)

## Risks

- **`user_data` changes can force EC2 instance replacement.** This is the
  central risk here — explicitly gated in step 2: plan first, never apply a
  change that would replace the live instance without stopping to report it
  first. The hot-patch in step 1 is the safe, immediate fix regardless.
- **Yet another distinct bug could surface** on this deploy — if so, stop
  and report rather than iterating indefinitely without checking in.

## Rollback

`git revert` the `deploy.yml`/module changes. The instance hot-patch (AWS
CLI install) is additive and has no meaningful rollback need.
