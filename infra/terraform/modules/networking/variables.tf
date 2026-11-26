variable "vpc_id" {
  description = <<-EOT
    Existing VPC ID to use for the pilot. Leave null to fall back to the
    account's default VPC (via a data source) — the pilot deliberately does
    not create a new VPC.
  EOT
  type        = string
  default     = null
}

variable "subnet_ids" {
  description = <<-EOT
    Existing subnet IDs to place resources in. Leave empty to fall back to
    every subnet in the resolved VPC (via a data source).
  EOT
  type        = list(string)
  default     = []
}
