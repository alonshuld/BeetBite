data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-arm64-server-*"]
  }

  filter {
    name   = "architecture"
    values = ["arm64"]
  }
}

# --- Instance role ---------------------------------------------------------------

resource "aws_iam_role" "ec2" {
  name = "beetbite-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ec2_ssm" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "ec2_cloudwatch_agent" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

resource "aws_iam_role_policy" "ec2_config" {
  name = "beetbite-config"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "ReadRuntimeConfig"
        Effect   = "Allow"
        Action   = ["ssm:GetParameter", "ssm:GetParametersByPath"]
        Resource = "arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter${local.ssm_prefix}*"
      },
      {
        Sid      = "ReadDbMasterSecretForBootstrap"
        Effect   = "Allow"
        Action   = "secretsmanager:GetSecretValue"
        Resource = aws_db_instance.main.master_user_secret[0].secret_arn
      },
    ]
  })
}

# Upload and read dumps, never delete them: a compromised host cannot erase
# the backups (Object Lock enforces the same for 30 days regardless).
resource "aws_iam_role_policy" "ec2_backups" {
  name = "beetbite-backups"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:GetObject", "s3:AbortMultipartUpload"]
        Resource = "${aws_s3_bucket.backups.arn}/daily/*"
      },
      {
        Effect   = "Allow"
        Action   = "s3:ListBucket"
        Resource = aws_s3_bucket.backups.arn
      },
    ]
  })
}

resource "aws_iam_instance_profile" "ec2" {
  name = "beetbite-ec2-profile"
  role = aws_iam_role.ec2.name
}

# --- Instance --------------------------------------------------------------------

resource "aws_instance" "app" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.ec2_instance_type
  subnet_id              = data.aws_subnet.app.id
  vpc_security_group_ids = [aws_security_group.app.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2.name

  disable_api_termination = true
  disable_api_stop        = true

  credit_specification {
    cpu_credits = "unlimited"
  }

  maintenance_options {
    auto_recovery = "default"
  }

  metadata_options {
    http_tokens                 = "required"
    http_put_response_hop_limit = 2
  }

  root_block_device {
    volume_type = "gp3"
    volume_size = 20
    encrypted   = true
  }

  user_data = templatefile("${path.module}/templates/cloud-init.sh.tftpl", {
    region            = var.region
    ssm_prefix        = local.ssm_prefix
    repo_ssh_url      = "git@github.com:${var.github_owner}/${var.github_repository}.git"
    rds_address       = aws_db_instance.main.address
    master_secret_arn = aws_db_instance.main.master_user_secret[0].secret_arn
  })

  tags = {
    Name = local.name
  }

  # cloud-init runs once, on first boot. Without this, a newer Ubuntu AMI or
  # an edited template would make Terraform replace the running host.
  lifecycle {
    ignore_changes = [ami, user_data]
  }

  # The host reads these on first boot, so they must exist before it starts.
  depends_on = [
    aws_ssm_parameter.env,
    aws_ssm_parameter.env_secret,
    aws_ssm_parameter.app_db_password,
    aws_ssm_parameter.deploy_key,
    aws_ssm_parameter.ghcr_token,
    aws_ssm_parameter.ghcr_username,
    aws_ssm_parameter.backup_ping_url,
    aws_iam_role_policy.ec2_config,
    aws_iam_role_policy.ec2_backups,
    aws_iam_role_policy_attachment.ec2_ssm,
    github_repository_deploy_key.host,
  ]
}

resource "aws_eip" "app" {
  domain   = "vpc"
  instance = aws_instance.app.id

  tags = {
    Name = local.name
  }
}
