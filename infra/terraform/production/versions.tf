terraform {
  required_version = ">= 1.10"

  # Partial config: `terraform init -backend-config=backend.hcl`, where
  # backend.hcl is the bootstrap stack's `backend_hcl` output.
  backend "s3" {}

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.67"
    }
    github = {
      source  = "integrations/github"
      version = "~> 6.13"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.7"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.1"
    }
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = local.tags
  }
}

# The backup bucket lives in a second region so one regional outage cannot
# take both the database and its off-site copy.
provider "aws" {
  alias  = "backup"
  region = var.backup_region

  default_tags {
    tags = local.tags
  }
}

# Reads the token from GITHUB_TOKEN. It needs admin rights on the repo
# (environments, variables and deploy keys).
provider "github" {
  owner = var.github_owner
}

locals {
  name       = "beetbite-prod"
  ssm_prefix = "/beetbite/prod"

  # No domain = plain HTTP on the Elastic IP, for trying the stack out only:
  # logins and data cross the internet unencrypted. Setting domain_name later
  # switches to HTTPS (Caddy + Let's Encrypt) without rebuilding the host.
  has_domain = var.domain_name != ""
  app_fqdn   = var.app_subdomain == "" ? var.domain_name : "${var.app_subdomain}.${var.domain_name}"
  # Caddy site address: a hostname gets automatic HTTPS, ":80" serves HTTP.
  site_address = local.has_domain ? local.app_fqdn : ":80"
  app_url      = local.has_domain ? "https://${local.app_fqdn}" : "http://${aws_eip.app.public_ip}"

  tags = {
    Project     = "beetbite"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

data "aws_caller_identity" "current" {}
