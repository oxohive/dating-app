variable "github_org" {
  description = "GitHub org that owns the repo allowed to assume the deploy role."
  type        = string
  default     = "oxohive"
}

variable "github_repo" {
  description = "GitHub repo (without the org) allowed to assume the deploy role."
  type        = string
  default     = "dating-app"
}

variable "create_oidc_provider" {
  description = <<-EOT
    Whether to create the GitHub Actions OIDC provider. AWS only allows one
    OIDC provider per issuer URL per account — set this to false and supply
    existing_oidc_provider_arn if token.actions.githubusercontent.com is
    already registered in this account.
  EOT
  type        = bool
  default     = true
}

variable "existing_oidc_provider_arn" {
  description = "ARN of an already-existing GitHub OIDC provider, used when create_oidc_provider is false."
  type        = string
  default     = null
}

variable "oidc_thumbprints" {
  description = "TLS thumbprints for token.actions.githubusercontent.com. AWS no longer strictly requires these to be current, but the argument is still required."
  type        = list(string)
  default     = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

variable "deploy_role_name" {
  description = "Name of the IAM role GitHub Actions assumes to deploy."
  type        = string
  default     = "dating-app-pilot-gha-deploy"
}

variable "instance_arn" {
  description = "ARN of the pilot EC2 instance the deploy role may start/stop."
  type        = string
}

variable "artifact_bucket_arn" {
  description = "ARN of the S3 bucket used to stage deploy artifacts."
  type        = string
}

variable "ecr_repository_arn" {
  description = "ARN of the ECR repository the deploy role may push/pull images to. Use \"*\" only if no repository exists yet (not recommended long-term)."
  type        = string
  default     = "*"
}

variable "tags" {
  description = "Common tags."
  type        = map(string)
  default     = {}
}
