# infra

Terraform for the Dating-app pilot infrastructure, plus the two scheduler
Lambdas that power cost-controlled auto-stop/auto-start of the pilot EC2
instance.

## Status: code only, nothing has been applied

Everything in this directory is **infrastructure-as-code that has never been
run against the real AWS account**. No `terraform init` against a real
backend, no `terraform apply`, no resource has been created, modified,
started, or stopped. This is deliberate: this machine holds live, billed AWS
credentials for account-scoped use, and executing Terraform against that
account is a separate, explicitly-approved step tracked as its own future
task (see `tasks/0002-aws-pilot-infra`, owned elsewhere in this repo).

There is also no remote state yet. `infra/terraform/envs/pilot/versions.tf`
has a commented-out `backend "s3" { ... }` block — standing up that S3 state
bucket (+ lock table) and running the *first* real `terraform init` / `apply`
happens together, in that future task, with explicit sign-off before
anything touches the real account.

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
