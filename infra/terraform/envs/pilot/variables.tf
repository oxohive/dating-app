# All environment-specific values live here as variables with safe,
# generic defaults where a default makes sense. Nothing in this file (or
# its defaults) is a real account ID, real domain, or real secret — actual
# per-environment values belong in a local terraform.tfvars (gitignored by
# the root .gitignore owned elsewhere in this repo), not committed here.
# See terraform.tfvars.example for the placeholder shape.

variable "aws_region" {
  description = "AWS region for the pilot. Mumbai, as specified by the product plan."
  type        = string
  default     = "ap-south-1"
}

# --- Networking ---

variable "vpc_id" {
  description = "Existing VPC ID. Leave null to use the account's default VPC."
  type        = string
  default     = null
}

variable "subnet_ids" {
  description = "Existing subnet IDs. Leave empty to use all subnets in the resolved VPC."
  type        = list(string)
  default     = []
}

# --- EC2 app host ---

variable "instance_type" {
  description = "EC2 instance type for the pilot host."
  type        = string
  default     = "t3.medium"
}

variable "ssh_allowed_cidr_blocks" {
  description = "CIDR blocks allowed to SSH into the pilot host. Empty by default — use SSM Session Manager instead."
  type        = list(string)
  default     = []
}

variable "http_ingress_cidr_blocks" {
  description = "CIDR blocks allowed to reach the app over HTTP/HTTPS."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "root_volume_size_gb" {
  description = "Root EBS volume size, in GiB, for the pilot host."
  type        = number
  default     = 30
}

# --- S3 ---

variable "media_bucket_name" {
  description = "Globally-unique S3 bucket name for user media. Must be changed from the placeholder before any real apply."
  type        = string
  default     = "REPLACE_ME-dating-app-pilot-media"
}

variable "backup_bucket_name" {
  description = "Globally-unique S3 bucket name for DB backups. Must be changed from the placeholder before any real apply."
  type        = string
  default     = "REPLACE_ME-dating-app-pilot-backups"
}

variable "artifact_bucket_name" {
  description = "Globally-unique S3 bucket name used to stage CI deploy artifacts (lambda zips, etc)."
  type        = string
  default     = "REPLACE_ME-dating-app-pilot-artifacts"
}

# --- IAM / GitHub OIDC ---

variable "github_org" {
  description = "GitHub org allowed to assume the CI deploy role."
  type        = string
  default     = "oxohive"
}

variable "github_repo" {
  description = "GitHub repo (no org prefix) allowed to assume the CI deploy role."
  type        = string
  default     = "dating-app"
}

variable "create_oidc_provider" {
  description = "Whether to create the GitHub OIDC provider (set false if the account already has one)."
  type        = bool
  default     = true
}

variable "existing_oidc_provider_arn" {
  description = "Existing GitHub OIDC provider ARN, used only when create_oidc_provider is false."
  type        = string
  default     = null
}

variable "ecr_repository_name" {
  description = "Name of the ECR repository CI pushes backend images to (created in this env, not a placeholder)."
  type        = string
  default     = "dating-app-backend"
}

# --- Task 0013 additions: admin-web / marketing-site ECR repos ---
#
# Defaults below are referenced by name (not via a terraform output) in
# .github/workflows/deploy.yml's ECR_ADMIN_WEB_REPOSITORY /
# ECR_MARKETING_SITE_REPOSITORY GitHub Actions repo variables — if either
# default here is overridden in a real terraform.tfvars, update those GitHub
# variables (`gh variable set ...`) to match.

variable "ecr_admin_web_repository_name" {
  description = "Name of the ECR repository CI pushes admin-web images to."
  type        = string
  default     = "dating-app-admin-web"
}

variable "ecr_marketing_site_repository_name" {
  description = "Name of the ECR repository CI pushes marketing-site images to."
  type        = string
  default     = "dating-app-marketing-site"
}

variable "admin_web_ingress_cidr_blocks" {
  description = <<-EOT
    CIDR blocks allowed to reach admin-web over HTTP on its dedicated port
    (8081 — a distinct port was chosen over a `/admin/` nginx path prefix
    to avoid Next.js basePath/asset-path pitfalls). Defaults to the same
    open range as the rest of the pilot's HTTP ingress: admin-web is not
    further IP-restricted at the network layer because it already enforces
    its own application-level auth (RequireAdminAuth client-side, and the
    backend's own `is_admin` check server-side on every /admin/* endpoint
    — the real enforcement boundary), consistent with how the rest of this
    single-instance pilot is secured.
  EOT
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

# --- CloudWatch / budget ---

variable "alert_emails" {
  description = "Email addresses subscribed to CloudWatch alarm + budget alert notifications."
  type        = list(string)
  default     = []
}

variable "budget_limit_amount" {
  description = "Monthly cost budget cap."
  type        = number
  default     = 5000
}

variable "budget_limit_currency" {
  description = "Currency for the budget cap."
  type        = string
  default     = "INR"
}

variable "log_retention_days" {
  description = "Retention for the app CloudWatch log group, in days."
  type        = number
  default     = 30
}

# --- Scheduler (auto-stop / auto-start) ---

variable "stop_schedule_cron" {
  description = "EventBridge cron (UTC) for stopping the pilot instance. Default 18:30 UTC == 00:00 IST."
  type        = string
  default     = "cron(30 18 * * ? *)"
}

variable "start_schedule_cron" {
  description = "EventBridge cron (UTC) for starting the pilot instance. Default 02:30 UTC == 08:00 IST."
  type        = string
  default     = "cron(30 2 * * ? *)"
}

variable "schedule_enabled" {
  description = "Master on/off switch for the auto-stop/auto-start schedule."
  type        = bool
  default     = true
}

# --- Idle auto-stop / wake-on-demand (task 0005) ---

variable "idle_alarm_cpu_threshold_percent" {
  description = <<-EOT
    CPUUtilization percentage below which the instance is considered idle.
    Kept low (default 5%) so normal light usage doesn't false-positive as
    idle — this is a coarse heuristic for a single-instance pilot with no
    load balancer / request-count metric available.
  EOT
  type        = number
  default     = 5
}

variable "idle_alarm_evaluation_periods" {
  description = <<-EOT
    Number of consecutive periods CPUUtilization must stay below the idle
    threshold before the alarm fires and stops the instance. Combined with
    idle_alarm_period_seconds, the default (4 x 300s = 20 minutes) sits in
    the middle of the "15 to 30 minutes" idle window asked for.
  EOT
  type        = number
  default     = 4
}

variable "idle_alarm_period_seconds" {
  description = "Period, in seconds, for the idle alarm's CPUUtilization evaluation."
  type        = number
  default     = 300
}

# --- Cognito (stub, disabled until auth feature lands) ---

variable "cognito_enabled" {
  description = "Enable the Cognito stub module. Stays false until the auth feature lands."
  type        = bool
  default     = false
}
