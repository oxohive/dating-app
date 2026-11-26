variable "enabled" {
  description = <<-EOT
    Master switch for this module. Default false: Cognito is not needed
    until the auth feature lands, so this module is a stub that creates
    nothing by default. Flip to true (and fill in the other variables) when
    auth work begins.
  EOT
  type        = bool
  default     = false
}

variable "user_pool_name" {
  description = "Name for the Cognito User Pool, used only if enabled."
  type        = string
  default     = "dating-app-pilot-users"
}

variable "app_client_name" {
  description = "Name for the Cognito User Pool App Client, used only if enabled."
  type        = string
  default     = "dating-app-pilot-client"
}

variable "tags" {
  description = "Common tags."
  type        = map(string)
  default     = {}
}
