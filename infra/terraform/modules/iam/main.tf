# IAM module — GitHub Actions OIDC deploy role
#
# Lets GitHub Actions in oxohive/dating-app assume a role to deploy, without
# any long-lived AWS access keys stored as GitHub secrets. Scoped tightly to
# what CI actually needs: start/stop/describe the one pilot instance, send
# SSM commands to it, push/pull container images, and read/write the deploy
# artifact bucket.

data "aws_partition" "current" {}
data "aws_caller_identity" "current" {}

resource "aws_iam_openid_connect_provider" "github" {
  count = var.create_oidc_provider ? 1 : 0

  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = var.oidc_thumbprints

  tags = var.tags
}

locals {
  oidc_provider_arn = var.create_oidc_provider ? aws_iam_openid_connect_provider.github[0].arn : var.existing_oidc_provider_arn
}

data "aws_iam_policy_document" "gha_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [local.oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    # Only this exact repo, any branch/tag/environment within it.
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_org}/${var.github_repo}:*"]
    }
  }
}

resource "aws_iam_role" "gha_deploy" {
  name               = var.deploy_role_name
  assume_role_policy = data.aws_iam_policy_document.gha_assume.json
  tags               = var.tags
}

data "aws_iam_policy_document" "gha_deploy" {
  statement {
    sid = "Ec2LifecycleOnPilotInstance"
    actions = [
      "ec2:StartInstances",
      "ec2:StopInstances",
    ]
    resources = [var.instance_arn]
  }

  statement {
    sid = "Ec2DescribeNoResourceLevelSupport"
    # ec2:Describe* does not support resource-level permissions.
    actions   = ["ec2:DescribeInstances", "ec2:DescribeInstanceStatus"]
    resources = ["*"]
  }

  statement {
    sid       = "SsmSendCommandToPilotInstance"
    actions   = ["ssm:SendCommand"]
    resources = [var.instance_arn]
  }

  statement {
    sid     = "SsmSendCommandDocument"
    actions = ["ssm:SendCommand"]
    resources = [
      "arn:${data.aws_partition.current.partition}:ssm:*:${data.aws_caller_identity.current.account_id}:document/AWS-RunShellScript",
    ]
  }

  statement {
    sid       = "SsmGetCommandInvocation"
    actions   = ["ssm:GetCommandInvocation", "ssm:ListCommandInvocations"]
    resources = ["*"]
  }

  statement {
    sid       = "EcrAuth"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"] # required: this action has no resource-level permissions
  }

  statement {
    sid = "EcrPushPull"
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
    resources = [var.ecr_repository_arn]
  }

  statement {
    sid = "ArtifactBucketReadWrite"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:ListBucket",
    ]
    resources = [
      var.artifact_bucket_arn,
      "${var.artifact_bucket_arn}/*",
    ]
  }
}

resource "aws_iam_role_policy" "gha_deploy" {
  name   = "${var.deploy_role_name}-policy"
  role   = aws_iam_role.gha_deploy.id
  policy = data.aws_iam_policy_document.gha_deploy.json
}
