output "user_pool_id" {
  value = var.enabled ? aws_cognito_user_pool.this[0].id : null
}

output "app_client_id" {
  value = var.enabled ? aws_cognito_user_pool_client.this[0].id : null
}
