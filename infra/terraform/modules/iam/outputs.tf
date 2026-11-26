output "deploy_role_arn" {
  value = aws_iam_role.gha_deploy.arn
}

output "deploy_role_name" {
  value = aws_iam_role.gha_deploy.name
}

output "oidc_provider_arn" {
  value = local.oidc_provider_arn
}
