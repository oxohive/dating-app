output "instance_id" {
  description = "Pilot EC2 instance ID."
  value       = module.ec2_app.instance_id
}

output "instance_public_ip" {
  description = "Pilot instance's current public IP. Task 0011 added a static Elastic IP here (removed in task 0018); this is once again AWS's standard ephemeral address, which changes on every stop/start. The env-wake Lambda Function URL (see env_wake_function_url) is the only address that stays stable across stop/start cycles — use it instead of bookmarking this value."
  value       = module.ec2_app.public_ip
}

output "media_bucket_id" {
  value = module.s3.media_bucket_id
}

output "backup_bucket_id" {
  value = module.s3.backup_bucket_id
}

output "artifact_bucket_id" {
  value = aws_s3_bucket.artifacts.id
}

output "gha_deploy_role_arn" {
  value = module.iam.deploy_role_arn
}

output "ecr_repository_url" {
  value = aws_ecr_repository.backend.repository_url
}

output "ecr_repository_name" {
  value = aws_ecr_repository.backend.name
}

output "ecr_admin_web_repository_url" {
  value = aws_ecr_repository.admin_web.repository_url
}

output "ecr_admin_web_repository_name" {
  value = aws_ecr_repository.admin_web.name
}

output "ecr_marketing_site_repository_url" {
  value = aws_ecr_repository.marketing_site.repository_url
}

output "ecr_marketing_site_repository_name" {
  value = aws_ecr_repository.marketing_site.name
}

output "marketing_site_url" {
  description = "Public marketing-site URL (task 0013) — served at the instance's current public IP's root path. This IP changes across stop/start since task 0018 removed the static Elastic IP; re-run `terraform output` after a stop/start to get the current value, or use env_wake_function_url for a stable address."
  value       = "http://${module.ec2_app.public_ip}/"
}

output "admin_web_url" {
  description = "Public admin-web URL (task 0013) — distinct port, gated by its own login + the backend's is_admin check. Same caveat as marketing_site_url: this IP changes across stop/start since task 0018 removed the static Elastic IP."
  value       = "http://${module.ec2_app.public_ip}:8081/"
}

output "alerts_topic_arn" {
  value = module.cloudwatch.alerts_topic_arn
}

output "env_start_lambda_arn" {
  value = aws_lambda_function.env_start.arn
}

output "env_stop_lambda_arn" {
  value = aws_lambda_function.env_stop.arn
}

output "idle_auto_stop_alarm_name" {
  value = aws_cloudwatch_metric_alarm.idle_auto_stop.alarm_name
}

output "env_wake_function_url" {
  description = "Base URL for the env-wake Lambda Function URL. Append ?secret=<value> (see the SSM parameter in env_wake_secret_parameter_name) to use it."
  value       = aws_lambda_function_url.env_wake.function_url
}

output "env_wake_secret_parameter_name" {
  description = "SSM parameter (SecureString) holding the current env-wake shared secret."
  value       = aws_ssm_parameter.env_wake_secret.name
}
