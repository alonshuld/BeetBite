#!/usr/bin/env bash
# Nightly logical backup of the production database to S3, run from cron on
# the EC2 host (/etc/cron.d/beetbite-backup). Streams a compressed pg_dump
# straight to the bucket, so nothing is written to the host's disk.
#
# Independent of RDS's own point-in-time recovery: it survives a deleted
# instance and mistakes found after the 35-day PITR window.
set -euo pipefail

root=/opt/beetbite
set -a
# shellcheck source=/dev/null
. "$root/.env"
set +a
: "${BACKUP_BUCKET:?BACKUP_BUCKET must be set in .env}"

# The bucket may sit in another region than the host, whose CLI has no default.
export AWS_DEFAULT_REGION="${BACKUP_REGION:-eu-central-1}"

stamp=$(date -u +%Y-%m-%dT%H%M%SZ)
key="daily/beetbite-${stamp}.dump"

# pipefail fails the run when pg_dump fails, even though aws s3 cp has
# already uploaded the partial stream; the heartbeat below is then skipped,
# so the missed ping raises the alert.
docker run --rm \
  -e PGSSLROOTCERT=/certs/rds-global-bundle.pem \
  -v "$root/certs:/certs:ro" \
  postgres:17-alpine \
  pg_dump --format=custom --no-owner --dbname="$DATABASE_URL" \
  | aws s3 cp - "s3://${BACKUP_BUCKET}/${key}"

echo "backup ok: s3://${BACKUP_BUCKET}/${key}"

if [ -n "${BACKUP_PING_URL:-}" ]; then
  curl -fsS -m 10 --retry 3 -o /dev/null "$BACKUP_PING_URL"
fi
