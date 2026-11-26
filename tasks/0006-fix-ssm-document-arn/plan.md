# Plan: 0006-fix-ssm-document-arn

## Goal

Fix the second IAM bug found during task 0004's redeploy attempt (run
45895241265 rerun), then get the pilot deploy to actually complete and
verify liveness.

## Root cause (confirmed by task 0004's agent)

`AWS-RunShellScript` is an Amazon-owned public SSM document (`Owner:
Amazon`, confirmed via `aws ssm describe-document`) — its real ARN has no
account-ID segment: `arn:aws:ssm:ap-south-1::document/AWS-RunShellScript`.
`infra/terraform/modules/iam/main.tf`'s `data.aws_iam_policy_document.gha_deploy`,
`SsmSendCommandDocument` statement, builds the resource ARN **with** the
caller's account ID (`arn:${partition}:ssm:*:${account_id}:document/AWS-RunShellScript`),
which never matches, so `ssm:SendCommand` is denied.

## Approach

Single small agent, same pattern as task 0004:

1. Fix the `SsmSendCommandDocument` statement's resource ARN in
   `infra/terraform/modules/iam/main.tf` to drop the account-ID segment:
   `arn:${partition}:ssm:*::document/AWS-RunShellScript` (confirm the exact
   existing syntax before editing — don't guess blindly). Also check
   whether the same statement (or a sibling one) needs a *second*,
   separate resource entry for the actual EC2 instance ARN (`ssm:SendCommand`
   typically needs both the document ARN and the target instance/managed-
   instance ARN granted — read the existing policy statement fully; if the
   instance-ARN half is already correct and only the document-ARN half is
   broken, fix only that).
2. `terraform plan` in `infra/terraform/envs/pilot` — must show only this
   one resource (the deploy role's policy) changing. Stop and report if not.
3. `terraform apply`.
4. Re-trigger the deploy: `gh run rerun <latest Deploy run id>` (check
   `gh run list` for the most recent `Deploy` run first — task 0004's push
   already triggered one via the `b325975` commit, runs `45898188301`/
   `45898188271`; use whichever is the actual `Deploy` workflow run, not
   `ci.yml`). Watch to completion.
5. If it fails again with yet another distinct error, report precisely
   rather than guessing further infra fixes blind.
6. Once green: verify `/health` on the instance's public IP, and
   `docker compose ps` via SSM showing all 5 services up.
7. Close out `tasks/0003-pilot-live-deploy/status.md` and
   `tasks/0004-fix-oidc-trust-policy/status.md` to `done` if genuinely
   everything in each is now verified true.

## Files / directories touched

- `infra/terraform/modules/iam/main.tf` (the one resource-ARN fix)
- `tasks/0006-fix-ssm-document-arn/**`
- `tasks/0003-pilot-live-deploy/status.md`, `tasks/0004-fix-oidc-trust-policy/status.md`
  (closing out once verified)

## Risks

Same class as 0004 — IAM policy edits are security-sensitive; mitigated by
a narrow, already-diagnosed single-line fix and a plan review before apply.

## Rollback

`git revert`; `terraform apply` restores the prior (broken) ARN if ever
needed.
