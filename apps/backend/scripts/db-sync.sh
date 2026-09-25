#!/bin/sh
# Brings the dev database and Prisma client in line with the checked-out code,
# and refuses to continue when they still disagree. Runs before `pnpm dev` so
# the server never boots against a schema it wasn't written for — the kind of
# mismatch that otherwise surfaces as a rare 500 on one screen.
#
#   1. migrate deploy  — applies committed migrations not yet in the DB. Never
#                        resets or re-creates anything; fails on a migration
#                        that previously failed half-way.
#   2. generate        — the client in src/generated is gitignored, so a pull
#                        that changed schema.prisma leaves it stale.
#   3. migrate diff    — the DB must now equal schema.prisma exactly. A
#                        difference means schema.prisma was edited without a
#                        migration, the DB was changed by hand, or it carries
#                        migrations from another branch.
set -e
cd "$(dirname "$0")/.."

prisma() { pnpm exec prisma "$@"; }

prisma migrate deploy
prisma generate >/dev/null

set +e
drift=$(prisma migrate diff --from-config-datasource \
  --to-schema prisma/schema.prisma --script --exit-code 2>&1)
status=$?
set -e
drift=$(printf '%s\n' "$drift" | grep -v '^Loaded Prisma config')

case $status in
  0) echo "db:sync — database matches schema.prisma" ;;
  2)
    cat >&2 <<EOF

db:sync — the database does not match prisma/schema.prisma.
SQL that would bring it in line:

$drift

If you edited schema.prisma:  pnpx prisma migrate dev --name <change>
If the DB drifted otherwise:  pnpx prisma migrate reset   (wipes dev data)
EOF
    exit 1
    ;;
  *)
    echo "$drift" >&2
    exit $status
    ;;
esac
