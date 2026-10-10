variable "region" {
  description = "Region the app and database run in."
  type        = string
  default     = "il-central-1"
}

variable "availability_zone" {
  description = "Single zone shared by the EC2 instance and RDS, so app-to-database traffic never crosses zones."
  type        = string
  default     = "il-central-1a"
}

variable "backup_region" {
  description = "Region of the nightly pg_dump bucket. Set it to the app region if client data must stay in Israel."
  type        = string
  default     = "eu-central-1"
}

variable "ec2_instance_type" {
  description = "Must be x86_64: the GHCR images are built for linux/amd64 only (arm64 under QEMU crashed Node during pnpm install)."
  type        = string
  default     = "t3.small"
}

variable "rds_instance_class" {
  type    = string
  default = "db.t4g.small"
}

variable "rds_multi_az" {
  description = "Flipping this to true later converts the instance without downtime."
  type        = bool
  default     = false
}

variable "domain_name" {
  description = "Apex domain, e.g. yourcompany.co.il. Empty serves plain HTTP on the Elastic IP: for a trial run with test data only."
  type        = string
  default     = ""
}

variable "app_subdomain" {
  description = "Host users type, under domain_name. Empty string serves the app on the apex."
  type        = string
  default     = "app"
}

variable "manage_dns" {
  description = "Whether Route 53 hosts the domain's DNS. False when the A record is created by hand at another DNS provider."
  type        = bool
  default     = true
}

variable "create_hosted_zone" {
  description = "Create the Route 53 zone. False when it already exists (e.g. the domain was bought through Route 53). Ignored when manage_dns is false."
  type        = bool
  default     = true
}

variable "caa_letsencrypt_only" {
  description = "Add a CAA record restricting certificate issuance for the whole domain to Let's Encrypt."
  type        = bool
  default     = false
}

variable "acme_email" {
  description = "Let's Encrypt account email; receives certificate expiry warnings. Defaults to the first alert email."
  type        = string
  default     = ""
}

variable "alert_emails" {
  description = "Recipients of CloudWatch alarms, RDS events and budget alerts. Each must click the SNS confirmation email."
  type        = list(string)
}

variable "monthly_budget_usd" {
  type    = number
  default = 70
}

variable "admin_username" {
  type    = string
  default = "admin"
}

variable "customer" {
  description = "Short lowercase name of the customer this stack deploys, e.g. rimonim. Names the GitHub environment (prod-<customer>) that CD deploys through; it must also be listed in the deploy matrix in .github/workflows/cd.yml."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,30}$", var.customer))
    error_message = "Use 2-31 lowercase letters, digits or hyphens, starting with a letter."
  }
}

variable "github_owner" {
  type    = string
  default = "alonshuld"
}

variable "github_repository" {
  type    = string
  default = "BeetBite"
}

variable "github_deploy_reviewers" {
  description = "GitHub user IDs (numeric) whose approval every deploy to this customer waits for. Empty list deploys without approval."
  type        = list(number)
  default     = []
}

variable "ghcr_username" {
  description = "GitHub user that owns ghcr_token. Leave empty when the GHCR packages are public."
  type        = string
  default     = ""
}

variable "ghcr_token" {
  description = "Classic PAT with only read:packages. Leave empty when the GHCR packages are public."
  type        = string
  default     = ""
  sensitive   = true
}

variable "backup_ping_url" {
  description = "Healthchecks.io (or similar) URL pinged after each successful nightly backup. Optional."
  type        = string
  default     = ""
}
