variable "media_bucket_name" {
  description = "Globally-unique bucket name for user-uploaded media (photos, etc)."
  type        = string
}

variable "backup_bucket_name" {
  description = "Globally-unique bucket name for database backups."
  type        = string
}

variable "force_destroy" {
  description = "Allow Terraform to delete these buckets even if they still contain objects. Keep false in real environments; only useful for throwaway test envs."
  type        = bool
  default     = false
}

variable "tags" {
  description = "Common tags applied to both buckets."
  type        = map(string)
  default     = {}
}
