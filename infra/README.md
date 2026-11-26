# infra

Terraform for the Dating-app pilot infrastructure, plus the two scheduler
Lambdas that power cost-controlled auto-stop/auto-start of the pilot EC2
instance.

## Status: real resources are live in the pilot env

The `pilot` env has been applied for real against AWS account
`767398004313` (`ap-south-1` / Mumbai), per `tasks/0002-aws-pilot-infra`.
This is a **live, billed environment** — a `t3.medium` EC2 instance, S3
buckets, an ECR repository, IAM/OIDC resources, Lambdas, CloudWatch alarms,
and a monthly cost budget all exist for real.

**Do not hardcode resource IDs/ARNs in docs or code.** They can change
(instance replaced, bucket recreated, etc). Always get current values with:

```sh
cd infra/terraform/envs/pilot
terraform output          # human-readable
terraform output -json    # machine-readable
```

### Remote state

Terraform state lives in S3, not locally:

- Bucket: `oxohive-dating-app-tfstate-767398004313` (region `ap-south-1`,
  versioned, SSE-S3 encrypted, fully public-access-blocked)
- Key: `pilot/terraform.tfstate`
- Locking: Terraform's native S3 lockfile (`use_lockfile = true` in
  `versions.tf`'s `backend "s3"` block) — no DynamoDB table.

The bucket itself was created directly via `aws s3api` (not by Terraform —
it can't manage the backend it depends on). See the `backend "s3" { ... }`
block in `infra/terraform/envs/pilot/versions.tf` for the exact
configuration.

### Known gap: root `.gitignore` does not exclude `*.tfvars`

Despite comments in `variables.tf` / `terraform.tfvars.example` claiming
`terraform.tfvars` is gitignored at the repo root, the root `.gitignore`
(owned outside this task's scope) does not actually have a `*.tfvars`
pattern. A scoped `infra/terraform/envs/pilot/.gitignore` was added as a
safeguard for this one directory, but the root `.gitignore` should still be
fixed to cover `*.tfvars` (with an exception for `*.tfvars.example`)
repo-wide.

### Known gap: AWS Budgets on this account only accepts USD

The user-approved cost cap was INR 5,000/month, but this AWS account's
Budgets API rejects `INR` (`InvalidParameterException: ... INR is not in
the supported unit set: [USD]`). The live budget alarm
(`dating-app-pilot-monthly-cap`) is currently set to **USD 55** as an
approximate, deliberately-rounded-down stand-in — this needs explicit
confirmation/adjustment from whoever owns the budget figure. See
`tasks/0002-aws-pilot-infra/status.md` for details.

## What's here

```
terraform/
  modules/
    networking/     # reads the account's default VPC/subnets (no new VPC)
    ec2-app/        # the single pilot EC2 instance (t3.medium), SG, IAM role
    s3/             # media bucket + db-backups bucket (private, versioned)
    iam/            # GitHub Actions OIDC provider + scoped deploy role
    cloudwatch/     # log group, CPU/mem/disk alarms, SNS topic, budget
    env-scheduler/  # EventBridge cron rules that invoke env-start/env-stop
    cognito-stub/   # disabled-by-default stub for when auth lands
  envs/
    pilot/          # wires all of the above together for the one pilot env
```

The pilot is intentionally a single EC2 t3.medium in `ap-south-1` (Mumbai)
running Nginx + FastAPI + PostgreSQL/PostGIS + Redis + Celery via Docker
Compose — not a highly-available architecture. Cost control for that always-on
instance comes from `env-scheduler` (EventBridge cron → Lambda → EC2
start/stop) plus an `aws_budgets_budget` alarm in the `cloudwatch` module.

## Running fmt / validate locally (safe, no AWS calls that matter)

These are the only Terraform commands anyone should run against this code
right now. All of them are local-only / syntax-only — they do not touch real
AWS state.

```sh
cd infra/terraform
terraform fmt -recursive

cd envs/pilot
terraform init -backend=false   # downloads providers only, no backend, no state
terraform validate
```

`terraform init -backend=false` keeps Terraform from trying to configure any
remote backend. `terraform validate` only checks the HCL is internally
consistent (types, required arguments, provider schema) — it does not talk to
AWS about any real resource and does not require credentials.

Do **not** run `terraform plan` or `terraform apply` here, even with
`-backend=false` — `plan` still calls AWS APIs for data sources (e.g. the
default VPC, latest AMI) and could need live credentials; it is out of scope
until the dedicated apply task is approved.

## Lambdas

`lambda/env-start` and `lambda/env-stop` are plain boto3 Lambda handlers
(`handler.handler`), idempotent (they check current instance state before
acting), and structured-logged with a correlation ID per invocation. See
`lambda/README` notes inline in each handler for details. They're packaged
by Terraform (`data.archive_file`) in `envs/pilot/main.tf` — no manual zip
step needed, and no zip/build artifacts are committed (see `.build/` is
git-ignored at the repo root).

## Variables / secrets

Every account-specific value (region, VPC/subnet IDs, bucket names, CIDR
ranges, budget amount, alert emails, GitHub org/repo) is a Terraform
variable with either no default or an obviously-fake placeholder default
(`REPLACE_ME-...`). Real values go in a local, uncommitted
`terraform.tfvars` — copy `envs/pilot/terraform.tfvars.example` and fill it
in. Nothing in this directory hardcodes the real AWS account ID or any
secret.
