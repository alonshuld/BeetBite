resource "aws_route53_zone" "main" {
  count = var.manage_dns && var.create_hosted_zone ? 1 : 0

  name = var.domain_name
}

data "aws_route53_zone" "existing" {
  count = var.manage_dns && !var.create_hosted_zone ? 1 : 0

  name = var.domain_name
}

locals {
  zone_id = !var.manage_dns ? null : (
    var.create_hosted_zone ? aws_route53_zone.main[0].zone_id : data.aws_route53_zone.existing[0].zone_id
  )
}

resource "aws_route53_record" "app" {
  count = var.manage_dns ? 1 : 0

  zone_id = local.zone_id
  name    = local.app_fqdn
  type    = "A"
  ttl     = 300
  records = [aws_eip.app.public_ip]
}

resource "aws_route53_record" "caa" {
  count = var.manage_dns && var.caa_letsencrypt_only ? 1 : 0

  zone_id = local.zone_id
  name    = var.domain_name
  type    = "CAA"
  ttl     = 3600
  records = ["0 issue \"letsencrypt.org\""]
}
