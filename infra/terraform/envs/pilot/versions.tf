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
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Remote state, bootstrapped in tasks/0002-aws-pilot-infra. The bucket
  # itself (versioned, SSE-S3 encrypted, fully public-access-blocked) was
  # created directly via `aws s3api` — Terraform can't manage the backend it
  # depends on. State locking uses Terraform's native S3 lockfile (no
  # DynamoDB table needed; requires Terraform >= 1.10, satisfied by the
  # required_version constraint above).
  backend "s3" {
    bucket       = "oxohive-dating-app-tfstate-767398004313"
    key          = "pilot/terraform.tfstate"
    region       = "ap-south-1"
    encrypt      = true
    use_lockfile = true
  }
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
