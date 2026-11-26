# Status: 0002-aws-pilot-infra

**State:** verifying

One item needs a human decision before this can move to `done` (see
"Outstanding — needs explicit confirmation" below): the AWS Budgets cost cap
had to be set in USD instead of the approved INR figure, because this AWS
account's Budgets API rejects INR outright. Everything else is complete and
verified.

## Definition-of-done checklist

- [x] Remote Terraform state bucket created and backend configured —
      `oxohive-dating-app-tfstate-767398004313` (ap-south-1, versioned,
      SSE-S3, public-access-blocked), `backend "s3"` block added to
      `infra/terraform/envs/pilot/versions.tf` with `use_lockfile = true`
      (native S3 locking, no DynamoDB table). `terraform init` against it
      succeeded.
- [x] ECR repository resource added; IAM deploy role scoped to its real ARN
      — `aws_ecr_repository.backend` added to `main.tf`
      (`dating-app-backend`, private, `scan_on_push = true`), and
      `module.iam`'s `ecr_repository_arn` now passed
      `aws_ecr_repository.backend.arn` instead of the `"*"` placeholder.
      Verified live: `aws ecr describe-repositories` confirms
      `scanOnPush: true`.
- [x] `terraform plan` reviewed and shows creation-only (no unexpected
      modify/destroy) — first plan: `43 to add, 0 to change, 0 to destroy`.
- [x] `terraform apply` completed successfully — 43/44 resources applied
      cleanly; one (`aws_budgets_budget.monthly_cap`) failed on first apply
      with `InvalidParameterException: ... INR is not in the supported unit
      set: [USD]` (a real AWS account constraint, not a module bug — this
      account's Budgets API only accepts USD). Fixed by switching
      `terraform.tfvars` to `budget_limit_currency = "USD"`,
      `budget_limit_amount = 55` (approximate equivalent of the approved
      INR 5,000/month, rounded down for a safety margin — see "Outstanding"
      below) and re-planning/applying just that one resource (clean
      `1 to add, 0 to change, 0 to destroy` plan). All 44 resources are now
      in state and live.
- [x] Outputs captured — see table below. Verified against the live account
      with `aws ec2 describe-instances`, `aws ecr describe-repositories`,
      `aws budgets describe-budget`, `aws sns list-subscriptions-by-topic`,
      `aws iam list-open-id-connect-providers`.
- [x] GitHub secrets/variables set on `oxohive/dating-app` matching
      `deploy.yml`'s expectations — `AWS_DEPLOY_ROLE_ARN` (secret),
      `EC2_INSTANCE_ID` and `ECR_REPOSITORY` (variables). Verified present
      via `gh secret list` / `gh variable list` (names/values for the
      non-secret vars only — secret value itself not re-displayed).
- [x] `infra/README.md` updated to reflect remote state, that real
      resources now exist, a pointer to `terraform output` instead of
      hardcoded IDs, and both known gaps below.
- [x] No deploy was triggered as a side effect of this task — no commit was
      pushed to `origin`, so `.github/workflows/deploy.yml` (push-to-`main`
      triggered) has not run as a result of this work. `deploy.yml` and
      `ci.yml` were not edited.
- [x] Rollback path (`terraform destroy`) confirmed understood and
      documented — see `plan.md`'s Rollback section. Not exercised (correctly
      — destroy was never run).

## Outstanding — needs explicit human confirmation

- **Budget currency/amount substitution.** The user-approved cap was
  **INR 5,000/month**. This AWS account's Budgets API only accepts **USD**
  (confirmed live: `InvalidParameterException: ... INR is not in the
  supported unit set: [USD]`). The live budget
  (`dating-app-pilot-monthly-cap`) is currently **USD 55/month**, a
  deliberately-rounded-down approximation (~INR 87/USD) chosen so the
  50/80/100% alert thresholds fire a bit earlier than the true INR cap would,
  not later. **This number was not explicitly approved — please confirm or
  adjust it** (edit `budget_limit_amount` in
  `infra/terraform/envs/pilot/terraform.tfvars`, then
  `terraform apply -target=module.cloudwatch.aws_budgets_budget.monthly_cap`,
  or the full plan/apply).
- **SNS email subscription is `PendingConfirmation`.** AWS requires the
  subscriber to click a confirmation link. `hiveoxo@gmail.com` needs to
  check that inbox (including spam) for an AWS Notification confirmation
  email and confirm it, or budget/CloudWatch alarm alerts will not actually
  be delivered.
- **Root `.gitignore` gap.** `variables.tf`, `terraform.tfvars.example`, and
  `infra/README.md` (pre-existing text) all claim the repo-root
  `.gitignore` excludes `*.tfvars`. It does not — verified by reading it
  directly. A scoped `infra/terraform/envs/pilot/.gitignore` was added as a
  safeguard (confirmed working: `git status` does not list
  `terraform.tfvars` as untracked), but the root `.gitignore` itself is out
  of this task's ownership (`ownership.md` lists "root files" as
  do-not-touch) and should be fixed separately.

## Resource identifiers (also available via `terraform output -json`)

| Output | Value |
|---|---|
| EC2 instance ID | `i-0d1b0c7d979b384f5` |
| EC2 public IP | `13.203.80.98` |
| IAM OIDC deploy role ARN | `arn:aws:iam::767398004313:role/dating-app-pilot-gha-deploy` |
| ECR repository URL | `767398004313.dkr.ecr.ap-south-1.amazonaws.com/dating-app-backend` |
| S3 media bucket | `oxohive-dating-app-pilot-media-767398004313` |
| S3 backup bucket | `oxohive-dating-app-pilot-backups-767398004313` |
| S3 artifact bucket | `oxohive-dating-app-pilot-artifacts-767398004313` |
| SNS alerts topic ARN | `arn:aws:sns:ap-south-1:767398004313:dating-app-pilot-alerts` |
| Terraform state bucket | `oxohive-dating-app-tfstate-767398004313` |

Moves to `done` only once the budget currency/amount is explicitly
confirmed by a human; everything else above is independently verified.
