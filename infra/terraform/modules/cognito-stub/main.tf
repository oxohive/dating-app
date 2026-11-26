# Cognito stub module
#
# Auth is not part of the pilot cutover — this module exists so the shape
# (variables/outputs/wiring point) is in place now, and is a one-line flip
# (`enabled = true`) plus real settings (password policy, MFA, callback
# URLs, social identity providers, etc.) once the auth feature actually
# lands. Everything is gated behind count so it creates zero resources
# today.

resource "aws_cognito_user_pool" "this" {
  count = var.enabled ? 1 : 0
  name  = var.user_pool_name
  tags  = var.tags
}

resource "aws_cognito_user_pool_client" "this" {
  count        = var.enabled ? 1 : 0
  name         = var.app_client_name
  user_pool_id = aws_cognito_user_pool.this[0].id

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  generate_secret = false
}
