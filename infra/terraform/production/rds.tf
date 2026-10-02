# Created before the instance so its retention setting applies from the first
# log line; RDS would otherwise create it with infinite retention.
resource "aws_cloudwatch_log_group" "rds_postgresql" {
  name              = "/aws/rds/instance/${local.name}/postgresql"
  retention_in_days = 30
}

resource "aws_db_instance" "main" {
  identifier     = local.name
  engine         = "postgres"
  engine_version = "17"
  instance_class = var.rds_instance_class

  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = "beetbite"
  username = "beetbite_admin"
  # The master password lives in Secrets Manager, managed and rotated by RDS,
  # so it never enters Terraform state. The app connects as beetbite_app.
  manage_master_user_password = true

  multi_az               = var.rds_multi_az
  availability_zone      = var.rds_multi_az ? null : var.availability_zone
  db_subnet_group_name   = aws_db_subnet_group.db.name
  vpc_security_group_ids = [aws_security_group.db.id]
  publicly_accessible    = false
  ca_cert_identifier     = "rds-ca-rsa2048-g1"

  backup_retention_period  = 35
  backup_window            = "23:00-23:30"
  maintenance_window       = "sat:00:00-sat:00:30"
  copy_tags_to_snapshot    = true
  delete_automated_backups = false

  auto_minor_version_upgrade      = true
  enabled_cloudwatch_logs_exports = ["postgresql"]

  deletion_protection       = true
  skip_final_snapshot       = false
  final_snapshot_identifier = "${local.name}-final"

  depends_on = [aws_cloudwatch_log_group.rds_postgresql]

  lifecycle {
    prevent_destroy = true
  }
}
