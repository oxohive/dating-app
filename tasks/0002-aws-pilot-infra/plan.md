# Plan: 0002-aws-pilot-infra

## Goal

Provision the real AWS pilot environment from the Terraform code written in
task 0001 (`infra/terraform/envs/pilot`), and wire the resulting resource
identifiers into GitHub Actions so `.github/workflows/deploy.yml`'s
`check-ready` gate goes from "skip" to "live" on the next merge to `main`.

This is the first task in this repo that spends real money and touches a
live AWS account (767398004313). Budget cap and alert email were confirmed
with the user before dispatch: **₹5,000/month**, alerts to
**hiveoxo@gmail.com**.

## Approach

Unlike task 0001, this task is **not** decomposed into parallel subtasks.
Every step here hard-depends on the previous step's output (state bucket
must exist before `terraform init` with a remote backend; `terraform apply`
must finish before resource IDs/ARNs exist; those IDs must exist before
GitHub secrets/vars can be set) — per `SKILL.md` section 2, steps with this
kind of real dependency chain are sequenced, not parallelized. One agent
runs the whole sequence:

1. **Bootstrap remote state.** Create a dedicated, versioned, encrypted,
   public-access-blocked S3 bucket for Terraform state (not managed by
   Terraform itself — a bootstrap resource, created directly via `aws s3api`).
   Add an `s3` backend block to `infra/terraform/envs/pilot` pointing at it.
2. **Add the missing ECR repository.** Task 0001's `iam` module left
   `ecr_repository_arn` defaulted to `"*"` because no ECR repo existed yet.
   Add a real `aws_ecr_repository` resource (private, image scan on push) to
   `envs/pilot`, and tighten the IAM deploy role's ECR permissions to that
   repo's real ARN instead of `"*"`.
3. **Set real `terraform.tfvars`** (not committed — stays local/untracked,
   matching the existing `*.tfvars` gitignore pattern, only the
   `.example` file is tracked): region `ap-south-1`, instance type
   `t3.medium`, `budget_limit_amount = 5000`, `budget_limit_currency = "INR"`,
   `alert_emails = ["hiveoxo@gmail.com"]`, `github_repo = "oxohive/dating-app"`
   (for the OIDC trust condition), `create_oidc_provider = true` (confirmed
   via `aws iam list-open-id-connect-providers` that none exists in this
   account yet), `ssh_allowed_cidr_blocks = []` (keep the secure default — no
   SSH ingress, SSM Session Manager only).
4. **`terraform init` against the real backend, then `terraform plan`.**
   Since this is the first apply, the plan must show only resource
   *creations* — no modifications or destructions of anything pre-existing.
   If the plan shows anything unexpected, stop and report rather than apply.
5. **`terraform apply`** (auto-approve only after the plan has been reviewed
   and matches expectations).
6. **Capture outputs**: EC2 instance ID, IAM OIDC deploy role ARN, ECR
   repository URL, S3 media/backup bucket names, SNS topic ARN.
7. **Wire GitHub Actions**: `gh secret set AWS_DEPLOY_ROLE_ARN` and
   `gh variable set EC2_INSTANCE_ID` / `ECR_REPOSITORY` (names matching what
   `deploy.yml`'s `check-ready` job actually checks) on `oxohive/dating-app`,
   so the next merge to `main` deploys for real instead of skipping.
8. **Do not trigger a deploy now** — setting the secrets doesn't push a new
   commit, so `deploy.yml` won't run until the next merge. That's
   intentional: this task provisions infra, it doesn't ship app code.

## Files / directories touched

- `infra/terraform/envs/pilot/**` (backend block, ECR resource, tightened
  IAM policy reference)
- Real AWS resources in account 767398004313, region `ap-south-1`
- GitHub repo secrets/variables on `oxohive/dating-app` (not repo files)
- `tasks/0002-aws-pilot-infra/**` (this folder)

Everything else in the repo is out of scope and must not be touched.

## Risks

- **Real billing starts immediately on apply.** Mitigated by the confirmed
  ₹5,000/month Budgets alarm (50/80/100% thresholds) to hiveoxo@gmail.com,
  and by this being a single `t3.medium` + small S3/CloudWatch footprint
  matching the pilot estimate in `docs/product-plan.md`.
- **OIDC provider is account-wide and can only exist once per issuer URL.**
  Mitigated by checking `aws iam list-open-id-connect-providers` before
  dispatch (confirmed empty) and setting `create_oidc_provider = true`
  accordingly; if a provider were later added by something else, this would
  need to flip to `false` and reference the existing one instead.
- **Terraform state has no remote backend yet in the committed code** (task
  0001's infra agent deliberately left this for this task). Mitigated by
  step 1 above; until this is done, state only exists locally and is a
  single point of failure for the infra's own management — documented as a
  known gap in `infra/README.md` if not already.
- **First apply must not silently modify/destroy anything.** Mitigated by
  the explicit stop-and-report instruction in step 4 if `terraform plan`
  shows anything other than pure creation.

## Rollback

- Before `terraform apply`: trivial — nothing exists yet, just stop.
- After `terraform apply`: `terraform destroy` against the same state tears
  down everything this task created (EC2 instance, security group, IAM
  role/OIDC provider, S3 buckets, ECR repo, CloudWatch alarms/budget,
  EventBridge rules, Lambdas). This is destructive and must only be run with
  explicit user approval, same as the apply itself.
- GitHub secrets/vars can be unset with `gh secret delete` / `gh variable
  delete` independently of the AWS side if just the deploy wiring needs to
  be reverted.
