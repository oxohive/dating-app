variable "name_prefix" {
  description = "Prefix used for naming resources created by this module."
  type        = string
  default     = "dating-app-pilot"
}

variable "vpc_id" {
  description = "VPC ID to deploy into (from the networking module)."
  type        = string
}

variable "subnet_id" {
  description = "Subnet ID to launch the instance into (pick one from the networking module's subnet_ids)."
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type for the pilot host."
  type        = string
  default     = "t3.medium"
}

variable "ami_owner" {
  description = "Owner account ID used to filter the AMI data source. Default is Canonical (Ubuntu)."
  type        = string
  default     = "099720109477"
}

variable "ami_name_filter" {
  description = "Name filter used to resolve the latest AMI. Default resolves the latest Ubuntu 22.04 LTS amd64 image."
  type        = string
  default     = "ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"
}

variable "http_ingress_cidr_blocks" {
  description = "CIDR blocks allowed to reach the app over HTTP (80) and HTTPS (443)."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "ssh_allowed_cidr_blocks" {
  description = <<-EOT
    CIDR blocks allowed to SSH (port 22) into the instance. Defaults to an
    empty list — i.e. no SSH ingress at all — because day-to-day access is
    expected to go through AWS Systems Manager Session Manager instead of
    SSH keys. Only set this if a specific, narrow CIDR genuinely needs direct
    SSH access.
  EOT
  type        = list(string)
  default     = []
}

variable "root_volume_size_gb" {
  description = "Root EBS volume size in GiB."
  type        = number
  default     = 30
}

variable "media_bucket_arn" {
  description = "ARN of the S3 media bucket the instance role may read/write."
  type        = string
}

variable "backup_bucket_arn" {
  description = "ARN of the S3 backups bucket the instance role may read/write."
  type        = string
}

variable "tags" {
  description = "Common tags applied to all resources in this module."
  type        = map(string)
  default     = {}
}
