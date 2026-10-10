# CD's deploy job assumes this role through GitHub's OIDC token, so no AWS
# keys are stored in GitHub. Only jobs in this customer's GitHub environment
# (`local.github_environment`) can assume it, and it can only run commands on
# this one instance. Each customer runs this stack in its own AWS account with
# its own state, so the environments never share a role.

resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
}

resource "aws_iam_role" "github_deploy" {
  name = "beetbite-github-deploy"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = aws_iam_openid_connect_provider.github.arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          "token.actions.githubusercontent.com:sub" = "repo:${var.github_owner}/${var.github_repository}:environment:${local.github_environment}"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "github_deploy" {
  name = "beetbite-deploy"
  role = aws_iam_role.github_deploy.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = "ssm:SendCommand"
        Resource = [
          aws_instance.app.arn,
          "arn:aws:ssm:${var.region}::document/AWS-RunShellScript",
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["ssm:GetCommandInvocation", "ssm:ListCommandInvocations"]
        Resource = "*"
      },
    ]
  })
}

resource "github_repository_environment" "production" {
  repository  = var.github_repository
  environment = local.github_environment

  dynamic "reviewers" {
    for_each = length(var.github_deploy_reviewers) > 0 ? [1] : []
    content {
      users = var.github_deploy_reviewers
    }
  }

  deployment_branch_policy {
    protected_branches     = false
    custom_branch_policies = true
  }
}

resource "github_repository_environment_deployment_policy" "main_only" {
  repository     = var.github_repository
  environment    = github_repository_environment.production.environment
  branch_pattern = "main"
}

resource "github_actions_environment_variable" "deploy_role" {
  repository    = var.github_repository
  environment   = github_repository_environment.production.environment
  variable_name = "AWS_DEPLOY_ROLE_ARN"
  value         = aws_iam_role.github_deploy.arn
}

resource "github_actions_environment_variable" "region" {
  repository    = var.github_repository
  environment   = github_repository_environment.production.environment
  variable_name = "AWS_REGION"
  value         = var.region
}

resource "github_actions_environment_variable" "instance_id" {
  repository    = var.github_repository
  environment   = github_repository_environment.production.environment
  variable_name = "EC2_INSTANCE_ID"
  value         = aws_instance.app.id
}

resource "github_repository_deploy_key" "host" {
  repository = var.github_repository
  title      = "${local.github_environment} (read-only, managed by Terraform)"
  key        = tls_private_key.deploy_key.public_key_openssh
  read_only  = true
}
