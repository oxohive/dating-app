terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }

  # Remote state is NOT configured yet. This whole env currently runs with a
  # local backend (fine for code review / `terraform validate -backend=false`
  # / `plan`-less syntax checking) and nothing has ever been applied against
  # real AWS. Switching on a real S3 backend, and the first real
  # `terraform apply`, is a dedicated future task requiring explicit
  # approval (see tasks/0002-aws-pilot-infra and infra/README.md) — do not
  # uncomment this before that task.
  #
  # backend "s3" {
  #   bucket         = "REPLACE_ME-tfstate-bucket"
  #   key            = "pilot/terraform.tfstate"
  #   region         = "ap-south-1"
  #   dynamodb_table = "REPLACE_ME-tf-locks"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "dating-app"
      Environment = "pilot"
      ManagedBy   = "terraform"
    }
  }
}
