output "instance_id" {
  description = "Pilot EC2 instance ID."
  value       = module.ec2_app.instance_id
}

output "instance_public_ip" {
  value = module.ec2_app.public_ip
}

output "static_public_ip" {
  description = "Static Elastic IP associated with the pilot instance (task 0011). Unlike instance_public_ip, this does not change across stop/start."
  value       = aws_eip.pilot.public_ip
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
  description = "Public marketing-site URL (task 0013) — served at the static IP's root path."
  value       = "http://${aws_eip.pilot.public_ip}/"
}

output "admin_web_url" {
  description = "Public admin-web URL (task 0013) — distinct port, gated by its own login + the backend's is_admin check."
  value       = "http://${aws_eip.pilot.public_ip}:8081/"
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
