# Pilot environment — wires the modules together.
#
# Single EC2 t3.medium pilot host in ap-south-1, S3 for media/backups,
# GitHub OIDC deploy role, CloudWatch logs/alarms/budget, a Cognito stub
# (disabled), and the env-start/env-stop Lambdas + their EventBridge
# schedule for cost-control auto-stop/auto-start.
#
# Applied for real against account 767398004313 (ap-south-1) in
# tasks/0002-aws-pilot-infra. See infra/README.md for current status and
# `terraform output` for live resource identifiers.

module "networking" {
  source = "../../modules/networking"

  vpc_id     = var.vpc_id
  subnet_ids = var.subnet_ids
}

module "s3" {
  source = "../../modules/s3"

  media_bucket_name  = var.media_bucket_name
  backup_bucket_name = var.backup_bucket_name
}

resource "aws_s3_bucket" "artifacts" {
  bucket = var.artifact_bucket_name

  tags = {
    Name    = var.artifact_bucket_name
    Purpose = "ci-deploy-artifacts"
  }
}

resource "aws_s3_bucket_versioning" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "artifacts" {
  bucket                  = aws_s3_bucket.artifacts.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

module "ec2_app" {
  source = "../../modules/ec2-app"

  vpc_id    = module.networking.vpc_id
  subnet_id = module.networking.subnet_ids[0]

  instance_type            = var.instance_type
  ssh_allowed_cidr_blocks  = var.ssh_allowed_cidr_blocks
  http_ingress_cidr_blocks = var.http_ingress_cidr_blocks
  root_volume_size_gb      = var.root_volume_size_gb

  media_bucket_arn  = module.s3.media_bucket_arn
  backup_bucket_arn = module.s3.backup_bucket_arn
}

resource "aws_ecr_repository" "backend" {
  name                 = var.ecr_repository_name
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name    = var.ecr_repository_name
    Purpose = "backend-container-images"
  }
}

# --- Task 0013 additions: admin-web / marketing-site ECR repos ---
#
# Same pattern as aws_ecr_repository.backend above.

resource "aws_ecr_repository" "admin_web" {
  name                 = var.ecr_admin_web_repository_name
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name    = var.ecr_admin_web_repository_name
    Purpose = "admin-web-container-images"
  }
}

resource "aws_ecr_repository" "marketing_site" {
  name                 = var.ecr_marketing_site_repository_name
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name    = var.ecr_marketing_site_repository_name
    Purpose = "marketing-site-container-images"
  }
}

module "iam" {
  source = "../../modules/iam"

  github_org                 = var.github_org
  github_repo                = var.github_repo
  create_oidc_provider       = var.create_oidc_provider
  existing_oidc_provider_arn = var.existing_oidc_provider_arn

  instance_arn        = module.ec2_app.instance_arn
  artifact_bucket_arn = aws_s3_bucket.artifacts.arn
  ecr_repository_arn  = aws_ecr_repository.backend.arn
}

module "cloudwatch" {
  source = "../../modules/cloudwatch"

  instance_id        = module.ec2_app.instance_id
  log_retention_days = var.log_retention_days
  alert_emails       = var.alert_emails

  budget_limit_amount   = var.budget_limit_amount
  budget_limit_currency = var.budget_limit_currency
}

module "cognito" {
  source = "../../modules/cognito-stub"

  enabled = var.cognito_enabled
}

# --- env-start / env-stop Lambdas ---
#
# Packaged from lambda/env-start and lambda/env-stop at the repo root. These
# are intentionally defined here (not inside env-scheduler, which only owns
# the EventBridge wiring) because they need their own minimal execution role
# and the INSTANCE_ID environment variable.

data "archive_file" "env_start" {
  type        = "zip"
  source_dir  = "${path.module}/../../../../lambda/env-start"
  output_path = "${path.module}/.build/env-start.zip"
  excludes    = ["requirements.txt", "__pycache__"]
}

data "archive_file" "env_stop" {
  type        = "zip"
  source_dir  = "${path.module}/../../../../lambda/env-stop"
  output_path = "${path.module}/.build/env-stop.zip"
  excludes    = ["requirements.txt", "__pycache__"]
}

data "aws_iam_policy_document" "lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "env_scheduler_lambda" {
  name_prefix        = "dating-app-pilot-env-sched-"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

data "aws_iam_policy_document" "env_scheduler_lambda" {
  statement {
    sid       = "Ec2StartStopOnPilotInstance"
    actions   = ["ec2:StartInstances", "ec2:StopInstances"]
    resources = [module.ec2_app.instance_arn]
  }

  statement {
    sid       = "Ec2DescribeNoResourceLevelSupport"
    actions   = ["ec2:DescribeInstances"]
    resources = ["*"]
  }

  statement {
    sid = "LambdaLogs"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    resources = ["arn:aws:logs:*:*:*"]
  }
}

resource "aws_iam_role_policy" "env_scheduler_lambda" {
  name   = "dating-app-pilot-env-sched-policy"
  role   = aws_iam_role.env_scheduler_lambda.id
  policy = data.aws_iam_policy_document.env_scheduler_lambda.json
}

resource "aws_lambda_function" "env_start" {
  function_name    = "dating-app-pilot-env-start"
  role             = aws_iam_role.env_scheduler_lambda.arn
  handler          = "handler.handler"
  runtime          = "python3.12"
  timeout          = 30
  filename         = data.archive_file.env_start.output_path
  source_code_hash = data.archive_file.env_start.output_base64sha256

  environment {
    variables = {
      INSTANCE_ID = module.ec2_app.instance_id
    }
  }
}

resource "aws_lambda_function" "env_stop" {
  function_name    = "dating-app-pilot-env-stop"
  role             = aws_iam_role.env_scheduler_lambda.arn
  handler          = "handler.handler"
  runtime          = "python3.12"
  timeout          = 30
  filename         = data.archive_file.env_stop.output_path
  source_code_hash = data.archive_file.env_stop.output_base64sha256

  environment {
    variables = {
      INSTANCE_ID = module.ec2_app.instance_id
    }
  }
}

module "env_scheduler" {
  source = "../../modules/env-scheduler"

  instance_id = module.ec2_app.instance_id

  env_start_lambda_arn           = aws_lambda_function.env_start.arn
  env_start_lambda_function_name = aws_lambda_function.env_start.function_name
  env_stop_lambda_arn            = aws_lambda_function.env_stop.arn
  env_stop_lambda_function_name  = aws_lambda_function.env_stop.function_name

  stop_schedule_cron  = var.stop_schedule_cron
  start_schedule_cron = var.start_schedule_cron
  schedule_enabled    = var.schedule_enabled
}

# --- Task 0003 additions: live-deploy wiring ---
#
# Additive only — no edits to existing resources or any module. Grants the
# two extra permissions the real deploy pipeline needs that weren't scoped
# in task 0002: the GitHub Actions deploy role reading the pilot DB password
# out of SSM, and the EC2 instance role reading the deploy assets
# (docker-compose.pilot.yml / nginx.conf / .env.pilot) that the deploy job
# stages in the artifacts bucket under deploy/.

data "aws_iam_policy_document" "gha_deploy_ssm_db_password" {
  statement {
    sid       = "ReadPilotDbPasswordParameter"
    actions   = ["ssm:GetParameter"]
    resources = ["arn:aws:ssm:ap-south-1:767398004313:parameter/dating-app/pilot/db_password"]
  }
}

resource "aws_iam_role_policy" "gha_deploy_ssm_db_password" {
  name   = "${module.iam.deploy_role_name}-ssm-db-password"
  role   = module.iam.deploy_role_name
  policy = data.aws_iam_policy_document.gha_deploy_ssm_db_password.json
}

data "aws_iam_policy_document" "app_instance_artifact_bucket_read" {
  statement {
    sid       = "ListDeployPrefixInArtifactBucket"
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.artifacts.arn]

    condition {
      test     = "StringLike"
      variable = "s3:prefix"
      values   = ["deploy/*"]
    }
  }

  statement {
    sid       = "GetDeployAssetsFromArtifactBucket"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.artifacts.arn}/deploy/*"]
  }
}

resource "aws_iam_role_policy" "app_instance_artifact_bucket_read" {
  name   = "${module.ec2_app.iam_role_name}-artifact-bucket-read"
  role   = module.ec2_app.iam_role_name
  policy = data.aws_iam_policy_document.app_instance_artifact_bucket_read.json
}

# --- Task 0009 addition: EC2 instance ECR read access ---
#
# Additive only. The GitHub Actions deploy role (module.iam) already has ECR
# auth/push/pull permissions, but that only authenticates the CI *runner*
# that builds and pushes the image — the EC2 instance's own Docker daemon
# has never logged in to ECR, so `docker compose pull` on the instance fails
# with "pull access denied ... no basic auth credentials". This grants the
# instance role exactly the read permissions it needs to log in to ECR and
# pull the private backend image itself.

data "aws_iam_policy_document" "app_instance_ecr_read" {
  statement {
    sid       = "EcrAuthNoResourceLevelSupport"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"] # required: this action has no resource-level permissions
  }

  statement {
    sid = "EcrPullBackendRepo"
    actions = [
      "ecr:BatchGetImage",
      "ecr:GetDownloadUrlForLayer",
      "ecr:BatchCheckLayerAvailability",
    ]
    resources = [aws_ecr_repository.backend.arn]
  }
}

resource "aws_iam_role_policy" "app_instance_ecr_read" {
  name   = "${module.ec2_app.iam_role_name}-ecr-read"
  role   = module.ec2_app.iam_role_name
  policy = data.aws_iam_policy_document.app_instance_ecr_read.json
}

# --- Task 0005 additions: idle auto-stop alarm + wake-on-demand Lambda ---
#
# Additive only. This adds a finer-grained, activity-based cost saver on
# top of (not instead of) the fixed env-scheduler cron above: the schedule
# is the outer bound (always off overnight), this stops the instance after
# ~20 minutes of low CPU during on-hours, and the env-wake Function URL
# lets anyone bring it back up on demand instead of waiting for the next
# scheduled start.

# 1. Idle CloudWatch alarm -> invokes the EXISTING env-stop Lambda directly
#    as its alarm action (no SNS topic needed; CloudWatch alarms can invoke
#    a Lambda ARN directly). env-stop's handler is reused completely
#    unmodified — it's already idempotent/safe to call this way.
resource "aws_cloudwatch_metric_alarm" "idle_auto_stop" {
  alarm_name          = "dating-app-pilot-idle-auto-stop"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = var.idle_alarm_evaluation_periods
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = var.idle_alarm_period_seconds
  statistic           = "Average"
  threshold           = var.idle_alarm_cpu_threshold_percent
  alarm_description   = "Pilot EC2 instance CPUUtilization has stayed below the idle threshold for ~${var.idle_alarm_evaluation_periods * var.idle_alarm_period_seconds / 60} minutes; stops it via env-stop (cost control during on-hours, on top of the fixed env-scheduler cron)."
  dimensions = {
    InstanceId = module.ec2_app.instance_id
  }
  # "missing" (not "notBreaching"), deliberately. Confirmed live against
  # this account: CloudWatch alarms configured with treat_missing_data =
  # "notBreaching" (or "breaching") will look BACK PAST a gap in the
  # metric to find enough real datapoints to fill evaluation_periods,
  # rather than only ever comparing the most recent consecutive window.
  # Observed in practice: the instance was stopped by this alarm, woken
  # via env-wake two minutes later, and the alarm re-fired almost
  # immediately — because it filled its 4-period window with 3 STALE
  # datapoints from before the stop plus 1 fresh one, not 4 fresh
  # post-wake datapoints. "missing" avoids that lookback entirely: a gap
  # (the expected steady state whenever the instance is off) just holds
  # the alarm in its current state rather than being evaluated at all,
  # so re-triggering after a wake requires genuinely fresh, consecutive
  # low-CPU periods again.
  treat_missing_data = "missing"
  alarm_actions      = [aws_lambda_function.env_stop.arn]
}

resource "aws_lambda_permission" "allow_cloudwatch_alarm_invoke_env_stop" {
  statement_id   = "AllowCloudWatchAlarmInvokeEnvStop"
  action         = "lambda:InvokeFunction"
  function_name  = aws_lambda_function.env_stop.function_name
  principal      = "lambda.alarms.cloudwatch.amazonaws.com"
  source_account = data.aws_caller_identity.current.account_id
  source_arn     = aws_cloudwatch_metric_alarm.idle_auto_stop.arn
}

data "aws_caller_identity" "current" {}

# 2. Wake-on-demand: a new small Lambda behind a Function URL (cheapest
#    option — no API Gateway needed), protected by a shared secret stored
#    as an SSM SecureString (see docs/runbooks/env-start-stop.md for how
#    it's obtained/rotated).

resource "random_password" "env_wake_secret" {
  length  = 32
  special = false

  # Changing this forces a new random value without touching anything
  # else — the documented rotation path (see the runbook) is
  # `terraform apply -replace=random_password.env_wake_secret`, which
  # achieves the same thing without needing a keepers bump.
}

resource "aws_ssm_parameter" "env_wake_secret" {
  name        = "/dating-app/pilot/env_wake_shared_secret"
  description = "Shared secret query-param value required to invoke the env-wake Lambda Function URL (?secret=<value>)."
  type        = "SecureString"
  value       = random_password.env_wake_secret.result

  tags = {
    Purpose = "env-wake-shared-secret"
  }
}

data "archive_file" "env_wake" {
  type        = "zip"
  source_dir  = "${path.module}/../../../../lambda/env-wake"
  output_path = "${path.module}/.build/env-wake.zip"
  excludes    = ["requirements.txt", "__pycache__"]
}

resource "aws_iam_role" "env_wake_lambda" {
  name_prefix        = "dating-app-pilot-env-wake-"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

data "aws_iam_policy_document" "env_wake_lambda" {
  statement {
    sid       = "Ec2StartOnPilotInstance"
    actions   = ["ec2:StartInstances"]
    resources = [module.ec2_app.instance_arn]
  }

  statement {
    sid       = "Ec2DescribeNoResourceLevelSupport"
    actions   = ["ec2:DescribeInstances"]
    resources = ["*"]
  }

  statement {
    sid       = "ReadWakeSharedSecret"
    actions   = ["ssm:GetParameter"]
    resources = [aws_ssm_parameter.env_wake_secret.arn]
  }

  statement {
    sid = "LambdaLogs"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    resources = ["arn:aws:logs:*:*:*"]
  }
}

resource "aws_iam_role_policy" "env_wake_lambda" {
  name   = "dating-app-pilot-env-wake-policy"
  role   = aws_iam_role.env_wake_lambda.id
  policy = data.aws_iam_policy_document.env_wake_lambda.json
}

resource "aws_lambda_function" "env_wake" {
  function_name    = "dating-app-pilot-env-wake"
  role             = aws_iam_role.env_wake_lambda.arn
  handler          = "handler.handler"
  runtime          = "python3.12"
  timeout          = 15
  filename         = data.archive_file.env_wake.output_path
  source_code_hash = data.archive_file.env_wake.output_base64sha256

  environment {
    variables = {
      INSTANCE_ID           = module.ec2_app.instance_id
      SECRET_PARAMETER_NAME = aws_ssm_parameter.env_wake_secret.name
    }
  }
}

resource "aws_lambda_function_url" "env_wake" {
  function_name      = aws_lambda_function.env_wake.function_name
  authorization_type = "NONE"
}

# A Function URL with authorization_type = "NONE" still requires explicit
# resource-based permissions before the Function URL service will invoke
# the function (otherwise every request 403s before the handler ever
# runs) — confirmed live against this account: AWS now requires BOTH a
# lambda:InvokeFunctionUrl grant AND a lambda:InvokeFunction grant (the
# latter became mandatory for new function URLs some time after this
# pattern was first documented; previously InvokeFunctionUrl alone
# sufficed). App-level access control is the shared-secret check inside
# the handler, not IAM, since this must be reachable by anyone with the
# URL + secret, with no AWS credentials.
#
# AWS's own guidance is to scope the second (InvokeFunction) statement to
# "only when invoked via a function URL" using the InvokedViaFunctionUrl
# condition key — but the installed aws provider (hashicorp/aws ~> 5.0;
# confirmed via `terraform providers schema -json`) does not expose that
# condition on aws_lambda_permission (only function_url_auth_type is
# supported there, and AWS's AddPermission API rejects that specific
# condition key on the InvokeFunction action with
# InvalidParameterValueException - confirmed live against this account).
# So this second grant is necessarily unconditioned. Accepted risk, not
# an oversight: the real security boundary is the app-level shared-secret
# check inside lambda/env-wake/handler.py, which runs for every
# invocation regardless of path (direct Invoke API or Function URL) - a
# caller without the correct secret gets the same 403 either way, so
# this grant only widens *how* someone without AWS credentials could
# reach the function, not what they could do without the secret.
resource "aws_lambda_permission" "allow_public_invoke_env_wake_url" {
  statement_id           = "AllowPublicInvokeEnvWakeFunctionUrl"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.env_wake.function_name
  principal              = "*"
  function_url_auth_type = "NONE"
}

resource "aws_lambda_permission" "allow_public_invoke_function_env_wake" {
  statement_id  = "AllowPublicInvokeFunctionEnvWake"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.env_wake.function_name
  principal     = "*"
}

# --- Task 0011 addition (REMOVED in task 0018) ---
#
# Task 0011 added a static Elastic IP (`aws_eip.pilot`) here to give the
# pilot a stable public URL across stop/start cycles, at a small ongoing
# idle-time AWS cost. Task 0018 removes it: the mobile app now does its
# own dynamic wake-and-discover against the env-wake Lambda (which has
# always looked up the instance's *current* public IP dynamically, EIP or
# not — see lambda/env-wake/handler.py), so nothing actually depends on
# the IP being static anymore. The instance's public IP (`aws_instance.app.
# public_ip`, exposed as `module.ec2_app.public_ip`) is once again AWS's
# standard ephemeral address: it changes on every stop/start, same as
# before task 0011. See docs/runbooks/env-start-stop.md for the resulting
# "the wake Lambda URL is the only thing that doesn't change" guidance,
# and tasks/0018-mobile-dynamic-wake-discovery/plan.md for the full
# rationale and rollback path (re-add this resource to restore a static
# IP).

# --- Task 0013 additions: deploy admin-web + marketing-site ---
#
# Additive only, same pattern as every prior task in this file: no edits to
# existing resources or modules. Extends the already-scoped GHA deploy role
# and EC2 instance role to also reach the two new ECR repos above, and opens
# the one new ingress port admin-web needs.

# 1. GitHub Actions deploy role: push/pull on the two new repos (mirrors
#    module.iam's own "EcrPushPull" statement, scoped to
#    aws_ecr_repository.backend.arn, which can't be extended in place
#    without editing the module itself).
data "aws_iam_policy_document" "gha_deploy_ecr_admin_web_marketing_site" {
  statement {
    sid = "EcrPushPullAdminWebMarketingSite"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:GetDownloadUrlForLayer",
      "ecr:BatchGetImage",
      "ecr:PutImage",
      "ecr:InitiateLayerUpload",
      "ecr:UploadLayerPart",
      "ecr:CompleteLayerUpload",
      "ecr:DescribeRepositories",
      "ecr:ListImages",
    ]
    resources = [
      aws_ecr_repository.admin_web.arn,
      aws_ecr_repository.marketing_site.arn,
    ]
  }
}

resource "aws_iam_role_policy" "gha_deploy_ecr_admin_web_marketing_site" {
  name   = "${module.iam.deploy_role_name}-ecr-admin-web-marketing-site"
  role   = module.iam.deploy_role_name
  policy = data.aws_iam_policy_document.gha_deploy_ecr_admin_web_marketing_site.json
}

# 2. EC2 instance role: pull-only on the two new repos (mirrors
#    data.aws_iam_policy_document.app_instance_ecr_read's "EcrPullBackendRepo"
#    statement above — ecr:GetAuthorizationToken is already granted
#    account-wide by that same policy, no need to re-grant it).
data "aws_iam_policy_document" "app_instance_ecr_read_admin_web_marketing_site" {
  statement {
    sid = "EcrPullAdminWebMarketingSiteRepos"
    actions = [
      "ecr:BatchGetImage",
      "ecr:GetDownloadUrlForLayer",
      "ecr:BatchCheckLayerAvailability",
    ]
    resources = [
      aws_ecr_repository.admin_web.arn,
      aws_ecr_repository.marketing_site.arn,
    ]
  }
}

resource "aws_iam_role_policy" "app_instance_ecr_read_admin_web_marketing_site" {
  name   = "${module.ec2_app.iam_role_name}-ecr-read-admin-web-marketing-site"
  role   = module.ec2_app.iam_role_name
  policy = data.aws_iam_policy_document.app_instance_ecr_read_admin_web_marketing_site.json
}

# 3. Security group: open admin-web's dedicated port (8081). The
#    path-prefix nginx alternative would have needed no SG change at all;
#    the distinct-port choice (see nginx.conf) needs exactly this one rule,
#    added here rather than inside modules/ec2-app so that module's own
#    inputs/outputs don't need to change for a pilot-env-specific choice.
resource "aws_security_group_rule" "admin_web_http" {
  type              = "ingress"
  from_port         = 8081
  to_port           = 8081
  protocol          = "tcp"
  cidr_blocks       = var.admin_web_ingress_cidr_blocks
  security_group_id = module.ec2_app.security_group_id
  description       = "admin-web (task 0013) - distinct port, avoids Next.js basePath complexity"
}
