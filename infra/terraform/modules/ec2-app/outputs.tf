output "instance_id" {
  value = aws_instance.app.id
}

output "instance_arn" {
  value = aws_instance.app.arn
}

output "public_ip" {
  value = aws_instance.app.public_ip
}

output "private_ip" {
  value = aws_instance.app.private_ip
}

output "security_group_id" {
  value = aws_security_group.app.id
}

output "iam_role_arn" {
  value = aws_iam_role.app_instance.arn
}

output "iam_role_name" {
  value = aws_iam_role.app_instance.name
}
