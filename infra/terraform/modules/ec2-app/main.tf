# EC2 app module — the single pilot host
#
# One t3.medium running Nginx + FastAPI + PostgreSQL/PostGIS + Redis + Celery
# via Docker Compose. Deliberately not highly-available: this is a
# cost-conscious MVP pilot, not production scale-out. Access is via AWS SSM
# Session Manager (no SSH key pair is created or required).

data "aws_ami" "app" {
  most_recent = true
  owners      = [var.ami_owner]

  filter {
    name   = "name"
    values = [var.ami_name_filter]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_security_group" "app" {
  name_prefix = "${var.name_prefix}-"
  description = "Pilot app host: HTTP/HTTPS in, optional restricted SSH, egress all."
  vpc_id      = var.vpc_id

  tags = merge(var.tags, { Name = "${var.name_prefix}-sg" })

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_security_group_rule" "http" {
  type              = "ingress"
  from_port         = 80
  to_port           = 80
  protocol          = "tcp"
  cidr_blocks       = var.http_ingress_cidr_blocks
  security_group_id = aws_security_group.app.id
  description       = "HTTP"
}

resource "aws_security_group_rule" "https" {
  type              = "ingress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = var.http_ingress_cidr_blocks
  security_group_id = aws_security_group.app.id
  description       = "HTTPS"
}

resource "aws_security_group_rule" "ssh" {
  count = length(var.ssh_allowed_cidr_blocks) > 0 ? 1 : 0

  type              = "ingress"
  from_port         = 22
  to_port           = 22
  protocol          = "tcp"
  cidr_blocks       = var.ssh_allowed_cidr_blocks
  security_group_id = aws_security_group.app.id
  description       = "Restricted SSH (prefer SSM Session Manager instead)"
}

resource "aws_security_group_rule" "egress_all" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.app.id
  description       = "All outbound"
}

# --- IAM: least-privilege instance role, no SSH key, SSM for shell access ---

data "aws_iam_policy_document" "ec2_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "app_instance" {
  name_prefix        = "${var.name_prefix}-"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json
  tags               = var.tags
}

resource "aws_iam_role_policy_attachment" "ssm_core" {
  role       = aws_iam_role.app_instance.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

data "aws_iam_policy_document" "app_s3" {
  statement {
    sid = "MediaBucketReadWrite"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:ListBucket",
    ]
    resources = [
      var.media_bucket_arn,
      "${var.media_bucket_arn}/*",
    ]
  }

  statement {
    sid = "BackupBucketReadWrite"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:ListBucket",
    ]
    resources = [
      var.backup_bucket_arn,
      "${var.backup_bucket_arn}/*",
    ]
  }
}

resource "aws_iam_role_policy" "app_s3" {
  name_prefix = "${var.name_prefix}-s3-"
  role        = aws_iam_role.app_instance.id
  policy      = data.aws_iam_policy_document.app_s3.json
}

resource "aws_iam_instance_profile" "app_instance" {
  name_prefix = "${var.name_prefix}-"
  role        = aws_iam_role.app_instance.name
}

resource "aws_instance" "app" {
  ami                    = data.aws_ami.app.id
  instance_type          = var.instance_type
  subnet_id              = var.subnet_id
  vpc_security_group_ids = [aws_security_group.app.id]
  iam_instance_profile   = aws_iam_instance_profile.app_instance.name

  # No `key_name` on purpose — access is via SSM Session Manager, not SSH keys.

  metadata_options {
    http_tokens   = "required" # IMDSv2 only
    http_endpoint = "enabled"
  }

  root_block_device {
    volume_size           = var.root_volume_size_gb
    volume_type           = "gp3"
    encrypted             = true
    delete_on_termination = true
  }

  user_data = base64encode(templatefile("${path.module}/user_data.sh.tpl", {
    app_name = "dating-app"
  }))

  tags = merge(var.tags, { Name = var.name_prefix })

  lifecycle {
    # Re-running user_data on every apply would be disruptive to a running
    # pilot host; application deploys go through the CI pipeline / SSM
    # instead of a fresh user_data run.
    ignore_changes = [ami]
  }
}
