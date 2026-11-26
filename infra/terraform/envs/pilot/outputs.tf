output "instance_id" {
  description = "Pilot EC2 instance ID."
  value       = module.ec2_app.instance_id
}

output "instance_public_ip" {
  value = module.ec2_app.public_ip
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

output "alerts_topic_arn" {
  value = module.cloudwatch.alerts_topic_arn
}

output "env_start_lambda_arn" {
  value = aws_lambda_function.env_start.arn
}

output "env_stop_lambda_arn" {
  value = aws_lambda_function.env_stop.arn
}
