# BeetBite infrastructure (Terraform)

Two stacks:

| Stack        | State                              | Creates                                                                                                                                                                                    |
| ------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `bootstrap`  | Local, run once                    | Enables `il-central-1`; S3 bucket for the production state                                                                                                                                 |
| `production` | S3 (from `bootstrap`), native lock | Security groups, RDS, EC2 + Elastic IP + first-boot setup, SSM config, backup bucket, OIDC deploy role, GitHub environment/variables/deploy key, Route 53, SNS, CloudWatch alarms, budget |

The full procedure, including the steps Terraform cannot do, is in the
deployment plan. Short version:

```bash
# Credentials: an AWS admin session (aws sso login) and a GitHub token with
# admin rights on the repo.
export GITHUB_TOKEN=...

cd infra/terraform/bootstrap
terraform init && terraform apply
terraform output -raw backend_hcl > ../production/backend.hcl

cd ../production
cp terraform.tfvars.example terraform.tfvars   # fill in
terraform init -backend-config=backend.hcl
terraform plan -out tfplan                     # read it
terraform apply tfplan
```

## One stack per customer

Each customer runs in its own AWS account. Deploy a new one by repeating the
steps above with that account's credentials, its own `bootstrap` state and
`terraform.tfvars` (set `customer = "<name>"`), then add `<name>` to the
`deploy` matrix in `.github/workflows/cd.yml`. The stack creates the GitHub
environment `prod-<name>` holding `AWS_DEPLOY_ROLE_ARN`, `AWS_REGION` and
`EC2_INSTANCE_ID`; the IAM role trusts only that environment, so a deploy for
one customer cannot reach another's account. Run a single customer by hand with
the workflow's `customer` input.

Things to know before changing anything here:

- **Read every plan.** RDS, the backup bucket and the state bucket have
  `prevent_destroy`, and RDS also has deletion protection. A plan that wants
  to replace one of them must be fixed, not forced.
- **The EC2 instance ignores `ami` and `user_data` changes.** First-boot setup
  (`templates/cloud-init.sh.tftpl`) runs once. To apply a template change, run
  the changed part by hand over Session Manager, or rebuild the host with
  `terraform apply -replace=aws_instance.app`. Data lives in RDS and S3, so a
  rebuild only loses the Caddy certificate cache, which is re-issued.
- **Secrets are in the state file** (app DB password, JWT secret, admin
  password, deploy key). The state bucket is private and encrypted; keep it
  that way. The RDS master password is not in state: RDS manages it in
  Secrets Manager.
- **Rotating a secret:** `terraform apply -replace=random_password.jwt_secret`
  (or `app_db`, `admin`), then re-run the first-boot script on the host:
  `sudo bash /var/lib/cloud/instance/scripts/part-001`. Every step in it is
  safe to repeat; it rewrites `.env`, sets the app DB role's password, and
  redeploys. Note that `ADMIN_PASSWORD` only takes effect on an empty
  database, and a new JWT secret logs every user out.
