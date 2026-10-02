# Production runbook

Procedures for when something goes wrong in production. The setup itself is
in `infra/terraform/` and the deployment plan.

Shell access to the host is through **EC2 → beetbite-prod → Connect → Session
Manager**, then `sudo -i`. Shorthand used below:

```bash
compose() { docker compose --env-file /opt/beetbite/.env -f /opt/beetbite/src/deploy/docker-compose.prod.yml "$@"; }
```

## Restore drill log

Run drill E before go-live, then every 6 months.

| Date | Who | PITR restore OK | Dump restore OK | Notes |
| ---- | --- | --------------- | --------------- | ----- |
|      |     |                 |                 |       |

## A. Roll back a bad deploy

Every commit's images stay in GHCR as `sha-<commit>`.

```bash
/opt/beetbite/src/deploy/deploy.sh <previous good full sha>
```

Prisma migrations only move forward. If the bad release ran a migration the
old code cannot handle, ship a fix forward instead, or use B.

## B. Point-in-time restore (bad migration, deleted rows, lost RDS disk)

RDS can restore to any second in the last 35 days.

1. Stop writes to the damaged database: `compose stop backend`.
2. **RDS → beetbite-prod → Actions → Restore to point in time.** Pick
   **Latest restorable time** for a crash, or a custom time just before the
   mistake. The console asks for that time in UTC.
3. Identifier `beetbite-prod-restore`. Use the same class, Single-AZ, subnet
   group `beetbite-db-subnets`, security group `beetbite-db-sg`, public access
   **No**, and the same zone (another zone if the original is down). Turn on
   deletion protection.
4. Wait for **Available** (about 15–20 minutes).
5. Rename the old instance to `beetbite-prod-old`, then the restored one to
   `beetbite-prod` (**Modify → Apply immediately** each time). The endpoint
   follows the name, so `.env` stays as it is. DNS can take a few minutes.
6. `compose up -d backend`, then smoke-test the app.
7. On the restored instance, check backup retention (35 days), the backup and
   maintenance windows, and deletion protection. Fix any that differ.
8. **Terraform:** the restored instance has a new resource ID, so update
   state before the next apply:
   `terraform state rm aws_db_instance.main` then
   `terraform import aws_db_instance.main beetbite-prod`, and check that
   `terraform plan` shows no replacement.
9. After a week, take a final snapshot of `beetbite-prod-old`, turn off its
   deletion protection, and delete it.

## C. Restore from a nightly dump (older than 35 days, or RDS unavailable)

1. Prepare an empty target database: a new RDS instance, or a new database
   on the existing one.
2. Restore:

   ```bash
   set -a; . /opt/beetbite/.env; set +a
   aws s3 ls --region "$BACKUP_REGION" "s3://$BACKUP_BUCKET/daily/"   # pick a dump
   aws s3 cp --region "$BACKUP_REGION" "s3://$BACKUP_BUCKET/daily/beetbite-<stamp>.dump" /tmp/restore.dump
   docker run --rm -v /tmp:/tmp -v /opt/beetbite/certs:/certs:ro \
     -e PGSSLROOTCERT=/certs/rds-global-bundle.pem postgres:17-alpine \
     pg_restore --no-owner --dbname="<target connection string, sslmode=verify-full>" /tmp/restore.dump
   rm /tmp/restore.dump
   ```

3. Point `DATABASE_URL` at the target: in SSM Parameter Store
   (`/beetbite/prod/DATABASE_URL`) when Terraform manages the host, otherwise
   in `.env`. Then run `/opt/beetbite/render-env.sh` and `deploy.sh` with the
   current commit.

## D. EC2 host lost or broken

The data is safe in RDS and S3.

- **With Terraform:** `terraform apply -replace=aws_instance.app`. The new
  host sets itself up on first boot and redeploys `main`. Progress is in
  `/var/log/beetbite-bootstrap.log`. Caddy re-issues the certificate.
- **Without Terraform:** repeat Phase 4 of the deployment plan on a new
  instance, move the Elastic IP to it, and run `deploy.sh`.

## E. Restore drill

1. Restore a point-in-time copy of `beetbite-prod` as `beetbite-drill` (B,
   steps 2–4; no renames).
2. From the host, connect with `psql` and compare row counts of `clients`,
   `projects` and `project_reports` with production.
3. Delete `beetbite-drill`, skipping the final snapshot.
4. Restore the latest nightly dump into a local Docker Postgres and run the
   same counts.
5. Add a row to the drill log above.

## Useful commands

```bash
compose ps                          # container state
compose logs --since 1h backend     # recent backend logs
curl -fsS https://$(grep ^APP_DOMAIN= /opt/beetbite/.env | cut -d= -f2-)/api/v1/health
tail -n 50 /var/log/beetbite-backup.log
/opt/beetbite/render-env.sh         # rebuild .env from SSM after a parameter change
```
