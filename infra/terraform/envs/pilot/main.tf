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
