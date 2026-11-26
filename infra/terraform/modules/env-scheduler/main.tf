# env-scheduler module — EventBridge cron wiring for env-start / env-stop
#
# This module does NOT create the Lambda functions themselves (those are
# defined by the caller, e.g. envs/pilot/main.tf, since they need the
# INSTANCE_ID env var and their own IAM execution role). It only creates the
# two scheduled EventBridge rules and the permissions letting EventBridge
# invoke each Lambda — cost control for the pilot via auto-stop/auto-start.

resource "aws_cloudwatch_event_rule" "stop" {
  name                = "${var.name_prefix}-env-stop-schedule"
  description         = "Stops the pilot EC2 instance outside active hours."
  schedule_expression = var.stop_schedule_cron
  state               = var.schedule_enabled ? "ENABLED" : "DISABLED"
  tags                = var.tags
}

resource "aws_cloudwatch_event_rule" "start" {
  name                = "${var.name_prefix}-env-start-schedule"
  description         = "Starts the pilot EC2 instance for active hours."
  schedule_expression = var.start_schedule_cron
  state               = var.schedule_enabled ? "ENABLED" : "DISABLED"
  tags                = var.tags
}

resource "aws_cloudwatch_event_target" "stop" {
  rule      = aws_cloudwatch_event_rule.stop.name
  target_id = "env-stop-lambda"
  arn       = var.env_stop_lambda_arn
  input = jsonencode({
    instance_id = var.instance_id
    reason      = "scheduled-stop"
  })
}

resource "aws_cloudwatch_event_target" "start" {
  rule      = aws_cloudwatch_event_rule.start.name
  target_id = "env-start-lambda"
  arn       = var.env_start_lambda_arn
  input = jsonencode({
    instance_id = var.instance_id
    reason      = "scheduled-start"
  })
}

resource "aws_lambda_permission" "allow_eventbridge_stop" {
  statement_id  = "AllowEventBridgeInvokeEnvStop"
  action        = "lambda:InvokeFunction"
  function_name = var.env_stop_lambda_function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.stop.arn
}

resource "aws_lambda_permission" "allow_eventbridge_start" {
  statement_id  = "AllowEventBridgeInvokeEnvStart"
  action        = "lambda:InvokeFunction"
  function_name = var.env_start_lambda_function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.start.arn
}
