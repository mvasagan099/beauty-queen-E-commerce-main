# Operational Runbook

Step-by-step procedures for common production issues. These use the real
project commands. For broader recovery guidance see
[DISASTER-RECOVERY.md](DISASTER-RECOVERY.md); for escalation see
[INCIDENT-RESPONSE.md](INCIDENT-RESPONSE.md).

> All commands assume you are on the deployment host in the repository root
> where `docker-compose.yml` lives.

---

## API Down

```
Check health → check logs → check dependencies → check recent deployment
→ rollback if required → verify
```

1. **Health**: `curl http://localhost:5000/api/health` and
   `curl http://localhost:5000/api/health/live`.
2. **Container state**: `docker-compose ps api`.
3. **Logs**: `docker-compose logs --tail=200 -f api`.
4. **Dependencies**: `docker-compose ps mysql redis` — are they healthy?
   `curl http://localhost:5000/api/health` shows DB/Redis status.
5. **Recent deployment**: did anything change? Check image tag / git ref.
6. **Restart**: `docker-compose restart api`.
7. **Rollback if required**: redeploy the previous image
   (see [ROLLBACK-PLAN.md](ROLLBACK-PLAN.md)).
8. **Verify**: `/api/health` → `ok`, smoke test a critical route.

---

## Worker Down

Email and in-app notifications stop, but orders/payments still work.

1. **Health**: worker health on port 5001:
   `curl http://localhost:5001/api/health/ready`.
2. **Container state**: `docker-compose ps worker`.
3. **Logs**: `docker-compose logs --tail=200 -f worker`.
4. **Redis**: `docker-compose ps redis` — the worker readiness probe needs
   Redis.
5. **Restart**: `docker-compose restart worker`.
6. **Verify queues draining**: `curl http://localhost:5000/api/metrics` →
   check `queues.email.waiting` / `queues.notifications.waiting` trend down.
7. If it keeps crashing, roll back the worker image.

> Note: the API container also runs the BullMQ processors, so queues may still
> drain while the dedicated worker is down.

---

## Redis Down

1. **Check**: `docker-compose ps redis`, `docker-compose logs --tail=100 redis`.
2. **Restart**: `docker-compose restart redis`.
3. **Verify**: `redis-cli ping` inside the container
   (`docker-compose exec redis redis-cli ping` → PONG).
4. **Queue impact**: Redis holds BullMQ job state. After recovery, check
   `/api/metrics` queue counts and re-drive any business notifications lost in
   the window (sender uses `jobId` dedupe, so re-enqueue is idempotent).
5. **Auth/rate-limit impact**: OTPs and rate-limit windows are ephemeral; users
   may need to re-request OTPs.

Redis is queue infrastructure, not a source of business truth — do not restore
from "backup"; just recover and reconcile.

---

## Database Down

**Never immediately run destructive commands.** First:

```
Check connection → check health → check logs → check disk → check connections
→ check recent migration → check backup
```

1. **Health**: `curl http://localhost:5000/api/health/ready` (fails if DB down).
2. **Container**: `docker-compose ps mysql`.
3. **Logs**: `docker-compose logs --tail=200 mysql`.
4. **Disk**: `docker-compose exec mysql df -h /var/lib/mysql`.
5. **Connections**: check connection count / pool saturation in logs.
6. **Recent migration**: was a migration just applied?
   `docker-compose exec api npx prisma migrate status`.
7. **Restart**: `docker-compose restart mysql`. If it does not recover or data
   is corrupt, follow the restore procedure in [BACKUP-RESTORE.md](BACKUP-RESTORE.md)
   (confirm a valid backup exists before restoring).

---

## Queue Stuck

1. **Check Redis**: `docker-compose ps redis`, `redis-cli ping`.
2. **Check worker**: `curl http://localhost:5001/api/health/ready`;
   `docker-compose logs --tail=200 worker`.
3. **Check failed jobs**: `docker-compose exec api node -e`
   (or a queue dashboard) — inspect the `failed` count via
   `curl http://localhost:5000/api/metrics`.
4. **Inspect error**: `docker-compose logs --tail=300 worker` for the failing
   job stack trace.
5. **Retry safe jobs**: re-enqueue idempotent jobs (email jobs dedupe by
   `jobId`) rather than deleting them.
6. **Verify**: watch `queues.*.waiting` / `failed` return to normal.

**Do not blindly delete queues.** Deleting a queue can silently drop
business-critical notifications. Reconcile before removing anything.

---

## Payment Failures

1. **Check logs**: `docker-compose logs --tail=200 api` for
   Razorpay/verification errors.
2. **Check Razorpay status**: is the provider up? (separate from app).
3. **Check webhook**: confirm `payment.captured` / `payment.failed` events are
   arriving at `/api/payments/webhook` and being signature-verified.
4. **Monitor spike**: watch payment failure rate via `/api/metrics`
   (`payments.failed`); alert on spikes.
5. **Never fabricate success**: only mark paid after signature verification /
   capture.
6. **Reconcile**: compare app payment records against Razorpay
   (missing / duplicate / unmatched / refund mismatch). Flag mismatches for
   review.
7. **Retry**: guide customers / retry pending payments through
   `/payments/retry` once the issue resolves.

---

## Reconciliation

Periodically verify order/payment/inventory consistency (see payment and order
reconciliation in PRODUCTION-OPERATIONS.md).

```bash
DATABASE_URL=mysql://... npx ts-node scripts/reconcile.ts
# Exit 0 = no discrepancies; exit 1 = discrepancies found (review each)
```

- **Never automatically** modify payment, order, or inventory records to force
  a match. Flag every discrepancy for human review.
- For payments, cross-check against **Razorpay** records (missing / duplicate /
  unmatched / refund mismatch) via the Razorpay dashboard/API.
- Compare recorded inventory against inventory movements; never silently
  overwrite stock values.

---

## High CPU

1. **Identify**: `docker-compose stats` to see which container is saturated.
2. **API/worker hot path**: check logs for slow queries / queue burst; check
   `/api/metrics` latency and queue depth.
3. **Database**: high CPU on MySQL often means missing-index or heavy query;
   check `prisma` logs and slow query logs.
4. **Scale out** if sustained (add instances behind the LB) or add indexes /
   caching per [INDEXES.md](INDEXES.md).

---

## High Memory

1. **Identify**: `docker-compose stats`.
2. **API/worker**: watch `/api/metrics` → `memory` (rss/heap). Leaks often come
   from unbounded caches/arrays or stale connections.
3. **Redis**: `docker-compose exec redis redis-cli INFO memory` — check
   evictions; set an appropriate maxmemory policy given it is ephemeral cache +
   queue infra.
4. **MySQL**: buffer pool sizing; check `information_schema` for table bloat.
5. **Restart** the affected container after confirming no financial op in
   flight, then monitor.

---

## Disk Full

1. **Check**: `df -h`, `docker system df`.
2. **Prune safely**: `docker image prune -f`, `docker builder prune -f` —
   never `docker volume prune` or bare `docker system prune -af` without
   verifying (volumes hold DB/data).
3. **Backups**: confirm backup retention is pruning old files
   (`scripts/backup.sh` deletes older than `RETENTION_DAYS`).
4. **Logs**: verify log rotation.
5. **Verbe**: ensure `mysql_data` and `uploads_data` volumes have headroom.

---

## Failed Deployment

1. **Check health**: `docker-compose ps`, `curl /api/health`.
2. **Check logs**: `docker-compose logs --tail=200 api worker web`.
3. **Env validation**: `NODE_ENV=production` hard-exits on missing/short
   `JWT_*` or missing Razorpay keys — confirm all secrets are set.
4. **Rollback**: redeploy the previous known-good image
   (see [ROLLBACK-PLAN.md](ROLLBACK-PLAN.md)).
5. **Migration**: if a migration was part of the deployment and is
   backward-incompatible, follow the DB rollback strategy; never drop columns
   still used by the previous version.
6. **Verify** after rollback: health + smoke test critical flows.

---

## Production Commands Reference

```
Start / build     docker-compose up -d --build
Stop one service  docker-compose stop <api|worker|web>
Restart           docker-compose restart <api|worker|web>
Logs              docker-compose logs -f <api|worker|web|mysql|redis>
Health            curl http://localhost:5000/api/health
                  curl http://localhost:5000/api/health/ready
Metrics           curl http://localhost:5000/api/metrics
Migration         docker-compose exec api npx prisma migrate deploy
Backup            bash scripts/backup.sh
Restore (DANGER)  bash scripts/restore.sh <file.sql.gz>
Reconcile         DATABASE_URL=... npx ts-node scripts/reconcile.ts
Worker (local)    cd apps/api && npm run start:worker
Rollback          docker-compose up -d --no-deps <svc>=<previous-tag>
```

### Dangerous Commands (never part of normal deployment)

```
docker-compose exec mysql mysql -e "DROP DATABASE beauty_queen;"
npx prisma migrate reset
docker-compose down -v            # deletes mysql_data, redis_data, uploads_data
redis-cli FLUSHALL
redis-cli DEL <queue>
```
