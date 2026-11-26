# Networking module — pilot
#
# Deliberately does NOT create a new VPC. The MVP pilot runs a single EC2
# instance and is cost-conscious, so it reuses the account's default VPC and
# subnets via data sources. If/when a dedicated VPC is needed, this module is
# the place to add it without touching callers (just stop passing the
# data-source fallback and create real resources instead).

data "aws_vpc" "default" {
  count   = var.vpc_id == null ? 1 : 0
  default = true
}

locals {
  vpc_id = var.vpc_id != null ? var.vpc_id : data.aws_vpc.default[0].id
}

data "aws_subnets" "in_vpc" {
  count = length(var.subnet_ids) == 0 ? 1 : 0

  filter {
    name   = "vpc-id"
    values = [local.vpc_id]
  }
}

locals {
  subnet_ids = length(var.subnet_ids) > 0 ? var.subnet_ids : data.aws_subnets.in_vpc[0].ids
}
