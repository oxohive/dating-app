output "stop_rule_arn" {
  value = aws_cloudwatch_event_rule.stop.arn
}

output "start_rule_arn" {
  value = aws_cloudwatch_event_rule.start.arn
}
