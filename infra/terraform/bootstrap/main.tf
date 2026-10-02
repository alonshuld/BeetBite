# One-time account bootstrap: turns on the Tel Aviv region and creates the S3
# bucket that holds the production stack's Terraform state.
#
# State for this stack stays local (it only owns the two resources below). If
# the local file is lost, re-import them rather than re-applying:
#   terraform import aws_s3_bucket.state <bucket-name>
#   terraform import aws_account_region.app <region>

terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.67"
    }
  }
}

variable "home_region" {
  description = "Region that holds the state bucket. Must be enabled by default (not opt-in), since this stack is what enables the opt-in app region."
  type        = string
  default     = "eu-central-1"
}

variable "app_region" {
  description = "Opt-in region the application runs in."
  type        = string
  default     = "il-central-1"
}

provider "aws" {
  region = var.home_region

  default_tags {
    tags = {
      Project   = "beetbite"
      ManagedBy = "terraform"
    }
  }
}

data "aws_caller_identity" "current" {}

resource "aws_account_region" "app" {
  region_name = var.app_region
  enabled     = true
}

resource "aws_s3_bucket" "state" {
  bucket = "beetbite-tfstate-${data.aws_caller_identity.current.account_id}"

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "state" {
  bucket = aws_s3_bucket.state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

output "backend_hcl" {
  description = "Contents for infra/terraform/production/backend.hcl."
  value       = <<-EOT
    bucket       = "${aws_s3_bucket.state.id}"
    key          = "production/terraform.tfstate"
    region       = "${var.home_region}"
    encrypt      = true
    use_lockfile = true
  EOT
}
