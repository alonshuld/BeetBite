# Runtime configuration for the host. Every parameter directly under
# ${local.ssm_prefix}/ becomes one KEY=value line of /opt/beetbite/.env
# (render-env.sh on the host); the bootstrap/ sub-path is read only by
# cloud-init and never lands in .env.
#
# Alphanumeric passwords only: they go into a URL and a shell script unquoted.

resource "random_password" "app_db" {
  length  = 32
  special = false
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = false
}

resource "random_password" "admin" {
  length  = 24
  special = false
}

resource "tls_private_key" "deploy_key" {
  algorithm = "ED25519"
}

locals {
  env_params = {
    APP_DOMAIN     = local.app_fqdn
    ACME_EMAIL     = var.acme_email
    ADMIN_USERNAME = var.admin_username
    BACKUP_BUCKET  = aws_s3_bucket.backups.id
    BACKUP_REGION  = var.backup_region
  }

  env_secrets = {
    DATABASE_URL   = "postgresql://beetbite_app:${random_password.app_db.result}@${aws_db_instance.main.address}:5432/beetbite?sslmode=require"
    JWT_SECRET     = random_password.jwt_secret.result
    ADMIN_PASSWORD = random_password.admin.result
  }
}

resource "aws_ssm_parameter" "env" {
  for_each = local.env_params

  name  = "${local.ssm_prefix}/${each.key}"
  type  = "String"
  value = each.value
}

resource "aws_ssm_parameter" "env_secret" {
  for_each = nonsensitive(toset(keys(local.env_secrets)))

  name  = "${local.ssm_prefix}/${each.key}"
  type  = "SecureString"
  value = local.env_secrets[each.key]
}

# SSM rejects empty values, so the optional ping URL only exists when set.
resource "aws_ssm_parameter" "backup_ping_url" {
  count = var.backup_ping_url == "" ? 0 : 1

  name  = "${local.ssm_prefix}/BACKUP_PING_URL"
  type  = "SecureString"
  value = var.backup_ping_url
}

resource "aws_ssm_parameter" "app_db_password" {
  name  = "${local.ssm_prefix}/bootstrap/APP_DB_PASSWORD"
  type  = "SecureString"
  value = random_password.app_db.result
}

resource "aws_ssm_parameter" "deploy_key" {
  name  = "${local.ssm_prefix}/bootstrap/DEPLOY_KEY"
  type  = "SecureString"
  value = tls_private_key.deploy_key.private_key_openssh
}

resource "aws_ssm_parameter" "ghcr_token" {
  count = nonsensitive(var.ghcr_token == "") ? 0 : 1

  name  = "${local.ssm_prefix}/bootstrap/GHCR_TOKEN"
  type  = "SecureString"
  value = var.ghcr_token
}

resource "aws_ssm_parameter" "ghcr_username" {
  count = var.ghcr_username == "" ? 0 : 1

  name  = "${local.ssm_prefix}/bootstrap/GHCR_USERNAME"
  type  = "String"
  value = var.ghcr_username
}
