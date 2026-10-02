#!/usr/bin/env bash
# Roll production to one commit: check out its deploy/ files, pull its images,
# restart the stack, and fail unless /api/v1/health answers within 3 minutes.
#
# Usage: deploy.sh <full commit sha>
# Run as root on the EC2 host — by CD through SSM, or by hand to roll back.
set -euo pipefail

sha="${1:?usage: deploy.sh <full commit sha>}"
root=/opt/beetbite
# SSM Run Command starts without HOME; git and ssh need it for the deploy key.
export HOME="${HOME:-/root}"

git -C "$root/src" fetch --quiet origin
git -C "$root/src" checkout --quiet --detach "$sha"
sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=sha-${sha}/" "$root/.env"

compose() {
  docker compose --env-file "$root/.env" -f "$root/src/deploy/docker-compose.prod.yml" "$@"
}

compose pull --quiet
compose up -d --remove-orphans
docker image prune -af --filter "until=168h" > /dev/null

app_url=$(grep '^APP_URL=' "$root/.env" | cut -d= -f2-)
for _ in $(seq 1 36); do
  if curl -fsS -o /dev/null "${app_url}/api/v1/health"; then
    echo "deploy ok: ${sha}"
    exit 0
  fi
  sleep 5
done

echo "backend not healthy 3 minutes after deploying ${sha}" >&2
compose ps >&2
compose logs --tail 50 backend >&2
exit 1
