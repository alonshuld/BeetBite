# The region's default VPC: its public subnets are enough at this scale. RDS
# stays private through its security group and publicly_accessible = false.

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

data "aws_subnet" "app" {
  vpc_id            = data.aws_vpc.default.id
  availability_zone = var.availability_zone
  default_for_az    = true
}

resource "aws_security_group" "app" {
  name        = "beetbite-app-sg"
  description = "BeetBite EC2: HTTP/HTTPS from anywhere, no SSH (Session Manager only)"
  vpc_id      = data.aws_vpc.default.id
}

resource "aws_vpc_security_group_ingress_rule" "app_web" {
  for_each = {
    "http-v4"  = { port = 80, protocol = "tcp", cidr_ipv4 = "0.0.0.0/0", cidr_ipv6 = null }
    "http-v6"  = { port = 80, protocol = "tcp", cidr_ipv4 = null, cidr_ipv6 = "::/0" }
    "https-v4" = { port = 443, protocol = "tcp", cidr_ipv4 = "0.0.0.0/0", cidr_ipv6 = null }
    "https-v6" = { port = 443, protocol = "tcp", cidr_ipv4 = null, cidr_ipv6 = "::/0" }
    "http3-v4" = { port = 443, protocol = "udp", cidr_ipv4 = "0.0.0.0/0", cidr_ipv6 = null }
    "http3-v6" = { port = 443, protocol = "udp", cidr_ipv4 = null, cidr_ipv6 = "::/0" }
  }

  security_group_id = aws_security_group.app.id
  description       = each.key
  ip_protocol       = each.value.protocol
  from_port         = each.value.port
  to_port           = each.value.port
  cidr_ipv4         = each.value.cidr_ipv4
  cidr_ipv6         = each.value.cidr_ipv6
}

resource "aws_vpc_security_group_egress_rule" "app_all" {
  security_group_id = aws_security_group.app.id
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"
}

resource "aws_security_group" "db" {
  name        = "beetbite-db-sg"
  description = "BeetBite RDS: PostgreSQL from the app instance only"
  vpc_id      = data.aws_vpc.default.id
}

resource "aws_vpc_security_group_ingress_rule" "db_from_app" {
  security_group_id            = aws_security_group.db.id
  description                  = "postgres from beetbite-app-sg"
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
  referenced_security_group_id = aws_security_group.app.id
}

resource "aws_db_subnet_group" "db" {
  name       = "beetbite-db-subnets"
  subnet_ids = data.aws_subnets.default.ids
}
