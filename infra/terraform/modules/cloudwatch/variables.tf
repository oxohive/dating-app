variable "name_prefix" {
  description = "Prefix used for naming resources in this module."
  type        = string
  default     = "dating-app-pilot"
}

variable "log_group_name" {
  description = "CloudWatch Logs log group name for application logs."
  type        = string
  default     = "/dating-app/pilot/app"
}

variable "log_retention_days" {
  description = "Retention for the app log group, in days."
  type        = number
  default     = 30
}

variable "instance_id" {
  description = "EC2 instance ID the alarms watch."
  type        = string
}

variable "cpu_alarm_threshold_percent" {
  description = "CPUUtilization percentage above which the CPU alarm fires."
  type        = number
  default     = 80
}

variable "disk_alarm_threshold_percent" {
  description = "Disk used-percent above which the disk alarm fires. Requires the CloudWatch agent to be publishing the CWAgent/disk_used_percent metric on the instance."
  type        = number
  default     = 85
}

variable "memory_alarm_threshold_percent" {
  description = "Memory used-percent above which the memory alarm fires. Requires the CloudWatch agent to be publishing the CWAgent/mem_used_percent metric on the instance."
  type        = number
  default     = 85
}

variable "alarm_evaluation_periods" {
  description = "Number of periods an alarm's condition must hold before it fires."
  type        = number
  default     = 3
}

variable "alarm_period_seconds" {
  description = "Period, in seconds, for alarm metric evaluation."
  type        = number
  default     = 300
}

variable "alert_emails" {
  description = "Email addresses subscribed to the alerts SNS topic (CloudWatch alarms + budget notifications)."
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

variable "budget_alert_threshold_percents" {
  description = "ACTUAL-spend percentages of the budget at which a notification fires."
  type        = list(number)
  default     = [50, 80, 100]
}

variable "tags" {
  description = "Common tags."
  type        = map(string)
  default     = {}
}
