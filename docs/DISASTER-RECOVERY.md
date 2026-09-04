# Disaster Recovery Plan - Beauty Queen E-Commerce

This document outlines the disaster recovery procedures for the Beauty Queen E-Commerce application. Follow these steps in order to recover from a full system failure.

---

## RPO (Recovery Point Objective)

| Data Category | Maximum Data Loss | Strategy |
|---|---|---|
| Application data (products, users, orders) | 24 hours | Daily automated database backups |
| Payment data | Near-zero | Razorpay retains all payment records; webhook_events table contains full audit trail of payment status changes |

The daily backup cycle means that in a worst-case failure, up to 24 hours of non-payment application data could be lost. Payment integrity is maintained through Razorpay's own records and our webhook audit trail.

---

## RTO (Recovery Time Objective)

| Phase | Target Time | Description |
|---|---|---|
| Database restore | 10 minutes | Restore MySQL from latest backup and apply migrations |
| Application startup | 5 minutes | Build and start all Docker services |
| Verification | 5 minutes | Confirm health checks pass and application is functional |
| **Total** | **30 minutes** | End-to-end recovery from backup to verified operation |

---

## Recovery Procedure

### 1. Database Recovery

Stop application services before restoring the database to prevent data corruption or partial writes during the restore.

```bash
# Stop application services
docker compose -f docker-compose.prod.yml stop api worker web

# Drop and recreate database
docker compose -f docker-compose.prod.yml exec -T mysql \
  mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "DROP DATABASE IF EXISTS beauty_queen; CREATE DATABASE beauty_queen;"

# Restore from backup
gunzip -c /var/backups/beauty-queen/latest.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T mysql \
  mysql -u root -p"$MYSQL_ROOT_PASSWORD" beauty_queen

# Apply any pending migrations
docker compose -f docker-compose.prod.yml exec -T api \
  npx prisma migrate deploy --schema=../../prisma/schema.prisma

# Restart services
docker compose -f docker-compose.prod.yml up -d --no-deps api worker web
```

After the database is restored and services are running, proceed to verification steps below.

### 2. Redis Recovery

Redis is used for the following, none of which are critical for data integrity:

- **Rate limiting counters** - Will reset naturally after restart
- **BullMQ job queues** - Failed jobs are in the `failed_jobs` list; completed jobs are already logged in the database via order_events
- **Distributed locks** - Will be re-acquired on demand
- **Cache data** - Will warm up on first access

Redis can be safely restarted without data restoration:

```bash
docker compose -f docker-compose.prod.yml restart redis
```

No backup restore is required for Redis. All business-critical data is persisted in MySQL.

### 3. Application Recovery

If the application server itself is compromised or needs redeployment, pull the latest code and rebuild:

```bash
cd /opt/beauty-queen
git pull origin main
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d --remove-orphans
sleep 15
curl -sf http://localhost/api/health/live
curl -sf http://localhost/api/health/ready
```

Both health endpoints must return HTTP 200. If either fails, check logs with:

```bash
docker compose -f docker-compose.prod.yml logs --tail=50 api
```

### 4. Secrets Recovery

All secrets are stored in environment variables and are never committed to code. Production secrets are managed via the deployment server's `.env.production` file.

**Backup location:** An encrypted copy of `.env.production` is stored on separate, off-site storage.

To restore secrets:

```bash
# Copy the encrypted backup to the deployment server and decrypt it
cp /path/to/encrypted-backup/.env.production /opt/beauty-queen/.env.production

# Restart services that consume environment variables
docker compose -f docker-compose.prod.yml restart api worker
```

Verify the environment is loaded correctly by confirming the health check passes:

```bash
curl -sf http://localhost/api/health/live
```

---

## Post-Recovery Verification

After completing all recovery steps, perform the following checks:

1. **Health endpoints** - Both `/api/health/live` and `/api/health/ready` return 200
2. **Database connectivity** - API logs show successful Prisma connection
3. **Redis connectivity** - API logs show successful Redis connection
4. **Worker processes** - BullMQ workers are consuming jobs from queues
5. **Order processing** - Place a test order (or verify a recent order) to confirm end-to-end flow
6. **Payment webhooks** - Confirm Razorpay webhook events are being received by checking the webhook_events table

```bash
# Quick status check
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=10 api worker
```

---

## Backup Schedule

| Backup Type | Frequency | Retention | Location |
|---|---|---|---|
| MySQL full dump (gzipped) | Daily at 02:00 UTC | 30 days | `/var/backups/beauty-queen/` |
| `.env.production` | Manual, after any secret change | Until next update | Encrypted off-site storage |

Backups are created by the automated cron job on the production server. Verify backup freshness before restoring:

```bash
ls -lh /var/backups/beauty-queen/latest.sql.gz
```

The file timestamp should be within the last 24 hours. If it is older, investigate the backup cron job before proceeding with recovery.
