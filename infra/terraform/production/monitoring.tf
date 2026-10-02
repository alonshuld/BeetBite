resource "aws_sns_topic" "alerts" {
  name = "beetbite-alerts"
}

# Each address receives a confirmation email; alerts only flow once it is clicked.
resource "aws_sns_topic_subscription" "alerts_email" {
  for_each = toset(var.alert_emails)

  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = each.value
}

locals {
  alarm_actions = [aws_sns_topic.alerts.arn]
}

# --- EC2 -----------------------------------------------------------------------

resource "aws_cloudwatch_metric_alarm" "ec2_system_check" {
  alarm_name          = "beetbite-ec2-system-check"
  alarm_description   = "Host hardware failed; EC2 recovers the instance onto healthy hardware."
  namespace           = "AWS/EC2"
  metric_name         = "StatusCheckFailed_System"
  dimensions          = { InstanceId = aws_instance.app.id }
  statistic           = "Maximum"
  period              = 60
  evaluation_periods  = 2
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  alarm_actions       = concat(local.alarm_actions, ["arn:aws:automate:${var.region}:ec2:recover"])
  ok_actions          = local.alarm_actions
}

resource "aws_cloudwatch_metric_alarm" "ec2_instance_check" {
  alarm_name          = "beetbite-ec2-instance-check"
  alarm_description   = "Guest OS unresponsive; EC2 reboots the instance."
  namespace           = "AWS/EC2"
  metric_name         = "StatusCheckFailed_Instance"
  dimensions          = { InstanceId = aws_instance.app.id }
  statistic           = "Maximum"
  period              = 60
  evaluation_periods  = 3
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  alarm_actions       = concat(local.alarm_actions, ["arn:aws:automate:${var.region}:ec2:reboot"])
  ok_actions          = local.alarm_actions
}

resource "aws_cloudwatch_metric_alarm" "ec2_cpu" {
  alarm_name          = "beetbite-ec2-cpu-high"
  namespace           = "AWS/EC2"
  metric_name         = "CPUUtilization"
  dimensions          = { InstanceId = aws_instance.app.id }
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 3
  threshold           = 80
  comparison_operator = "GreaterThanThreshold"
  alarm_actions       = local.alarm_actions
}

# CWAgent metrics come from the agent installed by cloud-init.
resource "aws_cloudwatch_metric_alarm" "ec2_memory" {
  alarm_name          = "beetbite-ec2-memory-high"
  namespace           = "CWAgent"
  metric_name         = "mem_used_percent"
  dimensions          = { InstanceId = aws_instance.app.id }
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 2
  threshold           = 90
  comparison_operator = "GreaterThanThreshold"
  alarm_actions       = local.alarm_actions
}

resource "aws_cloudwatch_metric_alarm" "ec2_disk" {
  alarm_name          = "beetbite-ec2-disk-high"
  namespace           = "CWAgent"
  metric_name         = "disk_used_percent"
  dimensions          = { InstanceId = aws_instance.app.id }
  statistic           = "Maximum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 80
  comparison_operator = "GreaterThanThreshold"
  alarm_actions       = local.alarm_actions
}

# --- RDS -----------------------------------------------------------------------

resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  alarm_name          = "beetbite-rds-cpu-high"
  namespace           = "AWS/RDS"
  metric_name         = "CPUUtilization"
  dimensions          = { DBInstanceIdentifier = aws_db_instance.main.identifier }
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 3
  threshold           = 80
  comparison_operator = "GreaterThanThreshold"
  alarm_actions       = local.alarm_actions
}

resource "aws_cloudwatch_metric_alarm" "rds_storage" {
  alarm_name          = "beetbite-rds-storage-low"
  namespace           = "AWS/RDS"
  metric_name         = "FreeStorageSpace"
  dimensions          = { DBInstanceIdentifier = aws_db_instance.main.identifier }
  statistic           = "Minimum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 4 * 1024 * 1024 * 1024
  comparison_operator = "LessThanThreshold"
  alarm_actions       = local.alarm_actions
}

resource "aws_cloudwatch_metric_alarm" "rds_memory" {
  alarm_name          = "beetbite-rds-memory-low"
  namespace           = "AWS/RDS"
  metric_name         = "FreeableMemory"
  dimensions          = { DBInstanceIdentifier = aws_db_instance.main.identifier }
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 3
  threshold           = 150 * 1024 * 1024
  comparison_operator = "LessThanThreshold"
  alarm_actions       = local.alarm_actions
}

resource "aws_db_event_subscription" "main" {
  name        = "beetbite-rds-events"
  sns_topic   = aws_sns_topic.alerts.arn
  source_type = "db-instance"
  source_ids  = [aws_db_instance.main.identifier]
  event_categories = [
    "availability",
    "failure",
    "failover",
    "low storage",
    "maintenance",
    "notification",
    "recovery",
  ]
}

# --- Cost ----------------------------------------------------------------------

resource "aws_budgets_budget" "monthly" {
  name         = "beetbite-monthly"
  budget_type  = "COST"
  limit_amount = tostring(var.monthly_budget_usd)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.alert_emails
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = var.alert_emails
  }
}
