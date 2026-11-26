# Status: 0004-fix-oidc-trust-policy

**State:** blocked

## What was fixed and verified

- Trust policy condition switched from `StringLike` on `sub`
  (`repo:oxohive/dating-app:*`, which never matched GitHub's real
  ID-embedded `sub` claim) to `StringEquals` on the stable `repository`
  claim (`oxohive/dating-app`), in
  `infra/terraform/modules/iam/main.tf`'s `gha_assume` policy document.
- **New finding during apply:** AWS's IAM API hard-rejects a GitHub-OIDC
  trust policy that has no `sub`/`job_workflow_ref` condition at all
  (`MalformedPolicyDocument: ... must evaluate ... sub or job_workflow_ref
  which is not scoped to all`). The literally-specified fix (drop `sub`
  entirely, use only `repository`) is not accepted by AWS. Resolved by
  keeping both conditions: `repository` (StringEquals, stable) **and** an
  exact (non-wildcard) `StringEquals` on `sub` pinned to this repo's one
  real value — `repo:oxohive@328794427/dating-app@1473604500:ref:refs/heads/main`
  — which is stable because `deploy.yml` only ever runs via `push` to
  `main` or `workflow_dispatch` against `main`, and the numeric org/repo
  IDs don't change. No wildcard `sub` pattern used, per ownership.md.
- `terraform plan`: exactly `0 to add, 1 to change, 0 to destroy` (the
  role's trust policy only), both before and after adding the `sub`
  condition back.
- `terraform apply`: applied cleanly (after the first attempt, with only
  `repository`, failed at the AWS API with the error above — nothing was
  changed by that failed attempt).
- Deploy run 45895241265 re-run (`gh run rerun`): **"Configure AWS
  credentials via OIDC" now succeeds** — confirms the trust-policy fix
  works for real. This is the exact problem this task was chartered to
  fix, and it is fixed and verified.
- Commit `b325975` ("Fix GitHub OIDC trust policy: match stable repository
  claim, not sub pattern") pushed to `main` (`88021d6..b325975`).

## New blocker found (different bug, out of this task's ownership)

The same re-run then failed at a **different** step: "Pull and restart
Docker Compose stack on instance", with:

    AccessDeniedException: User: .../dating-app-pilot-gha-deploy/GitHubActions
    is not authorized to perform: ssm:SendCommand on resource:
    arn:aws:ssm:ap-south-1::document/AWS-RunShellScript because no
    identity-based policy allows the ssm:SendCommand action

Root cause: `AWS-RunShellScript` is an Amazon-owned public SSM document
(confirmed via `aws ssm describe-document`: `Owner: Amazon`), so its real
ARN has **no account-ID segment**:
`arn:aws:ssm:ap-south-1::document/AWS-RunShellScript`. The `gha_deploy`
policy's `SsmSendCommandDocument` statement (same
`infra/terraform/modules/iam/main.tf`, `data.aws_iam_policy_document.gha_deploy`,
~line 80-85 — a different block from the trust policy this task owns)
builds the resource ARN **with** the caller's account ID
(`arn:${partition}:ssm:*:${account_id}:document/AWS-RunShellScript`),
which never matches the real document ARN, so the grant is a no-op.

This is a distinct, pre-existing bug from task 0002/0003, not caused by
and not fixed by this task's trust-policy change, and explicitly out of
this task's ownership (`ownership.md`: "trust policy condition only").
Not patched here — reported instead, per this task's own instructions on
a second, different failure. Needs a new task to fix the
`SsmSendCommandDocument` resource ARN (drop the account-ID segment).

## Definition-of-done checklist

- [x] Trust policy condition switched from `StringLike` on `sub` to a
      claim-stable condition in `infra/terraform/modules/iam/main.tf`
      (ended up keeping an exact-match `sub` condition alongside
      `repository`, for the AWS-side reason above — documented in the
      module's comments)
- [x] `terraform plan` showed exactly the one expected resource change
- [x] `terraform apply` completed
- [ ] Blocked `Deploy` run re-triggered and watched to completion, green —
      **re-triggered, OIDC step now passes, but run is red** on the new,
      unrelated SSM policy bug above
- [ ] `/health` confirmed reachable on the instance's public IP — not
      reached; deploy never got to restarting the compose stack
- [ ] `docker compose ps` on the instance confirms all 5 services up — not
      verified; blocked on the same new issue
- [ ] `tasks/0003-pilot-live-deploy/status.md` checklist closed out to
      match reality — updated to reflect the OIDC fix is confirmed and the
      new blocker, but not closed to done (deploy still isn't live)

Cannot move to `done`: the OIDC trust-policy bug this task targets is
fixed, verified, and shipped, but a second, different, pre-existing IAM
policy bug (SSM document ARN) now blocks the same deploy from completing.
Needs a follow-up task (recommend `0006-fix-ssm-document-arn` or similar)
to fix `data.aws_iam_policy_document.gha_deploy`'s `SsmSendCommandDocument`
statement.

**Update (task 0007):** the SSM document ARN bug (0006), the
AWS-CLI-missing-on-instance bug, and deploy.yml's silent-failure masking
(0007) have all since been fixed and verified. The OIDC fix this task made
remains confirmed working — "Configure AWS credentials via OIDC" still
passes on every subsequent run. The deploy chain is now blocked on a
fourth, distinct bug (EC2 instance Docker daemon not authenticated to
ECR — see `tasks/0007-.../status.md`). Still leaving this task as
`blocked`, not `done`, since the pilot still isn't live end-to-end.
