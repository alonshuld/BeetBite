output "app_url" {
  value = "https://${local.app_fqdn}"
}

output "elastic_ip" {
  description = "Point the app's A record here by hand when manage_dns is false."
  value       = aws_eip.app.public_ip
}

output "name_servers" {
  description = "Set these at the domain registrar when Terraform created the hosted zone."
  value       = var.manage_dns && var.create_hosted_zone ? aws_route53_zone.main[0].name_servers : []
}

output "instance_id" {
  value = aws_instance.app.id
}

output "rds_endpoint" {
  value = aws_db_instance.main.address
}

output "rds_master_secret_arn" {
  description = "Master credentials, managed and rotated by RDS. For break-glass admin only."
  value       = aws_db_instance.main.master_user_secret[0].secret_arn
}

output "backup_bucket" {
  value = aws_s3_bucket.backups.id
}

output "admin_password_parameter" {
  description = "Read the first-login admin password with: aws ssm get-parameter --with-decryption --name <this>"
  value       = aws_ssm_parameter.env_secret["ADMIN_PASSWORD"].name
}

output "github_deploy_role_arn" {
  value = aws_iam_role.github_deploy.arn
}
