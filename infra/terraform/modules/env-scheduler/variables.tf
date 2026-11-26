variable "name_prefix" {
  description = "Prefix used for naming resources in this module."
  type        = string
  default     = "dating-app-pilot"
}

variable "instance_id" {
  description = <<-EOT
    EC2 instance ID that the env-start/env-stop Lambdas act on. Not consumed
    directly by this module's resources (the Lambda functions themselves,
    defined by the caller, take it as their INSTANCE_ID environment
    variable) — kept here too so it's visible alongside the schedule and can
    be used in tags/descriptions.
  EOT
  type        = string
}

variable "env_start_lambda_arn" {
  description = "ARN of the env-start Lambda function (or alias) to invoke on the start schedule."
  type        = string
}

variable "env_start_lambda_function_name" {
  description = "Name of the env-start Lambda function, used for the EventBridge invoke permission."
  type        = string
}

variable "env_stop_lambda_arn" {
  description = "ARN of the env-stop Lambda function (or alias) to invoke on the stop schedule."
  type        = string
}

variable "env_stop_lambda_function_name" {
  description = "Name of the env-stop Lambda function, used for the EventBridge invoke permission."
  type        = string
}

variable "stop_schedule_cron" {
  description = <<-EOT
    EventBridge cron expression (UTC) for stopping the instance outside
    active hours. Default is 30 18 * * ? * (18:30 UTC == 00:00 IST), i.e.
    stop at midnight India time. Remember EventBridge cron is UTC and IST
    has no DST, so the UTC offset is always -5:30.
  EOT
  type        = string
  default     = "cron(30 18 * * ? *)"
}

variable "start_schedule_cron" {
  description = <<-EOT
    EventBridge cron expression (UTC) for starting the instance for active
    hours. Default is 30 2 * * ? * (02:30 UTC == 08:00 IST), i.e. start at
    8am India time.
  EOT
  type        = string
  default     = "cron(30 2 * * ? *)"
}

variable "schedule_enabled" {
  description = "Master on/off switch for both schedule rules, without destroying them."
  type        = bool
  default     = true
}

variable "tags" {
  description = "Common tags."
  type        = map(string)
  default     = {}
}
