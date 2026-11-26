# Plan: 0009-fix-ec2-ecr-auth

## Goal

Fix the fourth distinct deploy-chain bug found by task 0007: the pilot EC2
instance's Docker daemon has never logged in to ECR, so
`docker compose pull` for the private `dating-app-backend` image fails with
`no basic auth credentials`. GitHub Actions' own ECR login
(`aws-actions/amazon-ecr-login@v2`) only authenticates the *runner*, not the
instance.

## Approach

Single sequential agent (same `infra/terraform/envs/pilot` directory as the
prior four fixes).

1. Check the EC2 instance role's IAM policy (`infra/terraform/modules/iam`
   or wherever the instance role's permissions live) for ECR read access
   (`ecr:GetAuthorizationToken`, `ecr:BatchGetImage`,
   `ecr:GetDownloadUrlForLayer`, `ecr:BatchCheckLayerAvailability`). Add if
   missing (additive `aws_iam_role_policy`, same pattern as prior IAM
   fixes — narrowly scoped to the one backend ECR repo + the account-wide
   `GetAuthorizationToken` action, which AWS requires to be unscoped).
2. Add an ECR login step to `deploy.yml`'s on-instance SSM script, before
   `docker compose pull`: `aws ecr get-login-password --region ap-south-1 |
   docker login --username AWS --password-stdin
   <account>.dkr.ecr.ap-south-1.amazonaws.com` (use the AWS CLI already
   hot-patched onto the instance by task 0007). Keep the `set -e` /
   post-invocation status-check hardening from task 0007 intact — do not
   weaken it.
3. `terraform plan` (expect only the IAM addition, if needed) → apply.
4. Commit, push, re-trigger deploy, watch to completion.
5. Independently verify: `curl /health`, `docker compose ps` showing all 5
   services running — same bar as every prior attempt in this chain.
6. If yet another distinct failure appears, stop and report precisely
   (this is now the fifth iteration of the same gate — don't abandon it,
   but don't silently guess-patch either).
7. Only once every item is genuinely verified, flip `tasks/0003`, `0004`,
   `0006`, `0007` status files to `done`.

## Files / directories touched

- `infra/terraform/modules/iam/**` (additive ECR read policy, if missing)
- `.github/workflows/deploy.yml` (ECR login step added to the SSM script)
- `tasks/0009-fix-ec2-ecr-auth/**`
- `tasks/0003`, `0004`, `0006`, `0007` status files (closing out, once verified)

## Risks

Same class as prior IAM/deploy fixes — narrow, reviewed, plan-gated changes.

## Rollback

`git revert`; `terraform apply` restores the prior state if ever needed.
