output "vpc_id" {
  description = "Resolved VPC ID (either the one passed in, or the account's default VPC)."
  value       = local.vpc_id
}

output "subnet_ids" {
  description = "Resolved subnet IDs (either the ones passed in, or all subnets in the resolved VPC)."
  value       = local.subnet_ids
}
