# Disaster Recovery

Procedures for recovering the Beauty Queen e-commerce application from serious
failures. This complements [PRODUCTION-OPERATIONS.md](PRODUCTION-OPERATIONS.md),
[INCIDENT-RESPONSE.md](INCIDENT-RESPONSE.md) and
[BACKUP-RESTORE.md](BACKUP-RESTORE.md).

> These are playbooks, not automation. Always confirm against real logs and
> current state before acting. Mark financial state manually only when safe.

---

## Recovery Targets (RTO / RPO)

The business targets below are **chosen defaults** and must be confirmed
against actual business requirements before relying on them.

| Metric | Chosen Value | Meaning |
|--------|--------------|---------|
| **RTO** (Recovery Time Objective) | 4 hours | How quickly service should recover from a major failure |
| **RPO** (Recovery Point Objective) | 24 hours | Maximum acceptable data loss (aligns with daily backup) |

These values assume a **daily backup** and a **single-server** recovery within
reasonable time. If the business requires near-zero loss, RPO must be lowered
(e.g. hourly backups / binlog-based point-in-time recovery) and RTO requires an
automated redeployment path.

---

## 1. Database Loss / Corruption

```
Database unavailable/corrupt
        │
        ▼
Detect (health /api/health/ready fails, SELECT 1 errors, connection errors)
        │
        ▼
Stop unsafe operations (docker compose stop api worker web)
        │
        ▼
Assess (check logs, disk, container, recent migration)
        │
        ▼
Restore from most recent verified backup (scripts/restore.sh)
        │
        ▼
Run migrations if appropriate (npx prisma migrate deploy)
        │
        ▼
Verify data (users, products, orders, payments, order items)
        │
        ▼
Restore application traffic (docker compose up -d --no-deps api worker web)
```

See [RUNBOOK.md → Database issue](RUNBOOK.md) and [BACKUP-RESTORE.md](BACKUP-RESTORE.md).

---

## 2. Server Loss

1. Provision a new server (or fail to a standby).
2. Install Docker and Docker Compose.
3. Clone the repository.
4. Restore `.env` from secure backup.
5. Restore the database from the most recent verified backup
   (see [BACKUP-RESTORE.md](BACKUP-RESTORE.md)):
   ```bash
   bash scripts/restore.sh /var/backups/beauty-queen/latest.sql.gz
   ```
6. Restore the `uploads_data` volume from backup (product images).
7. Start the stack: `docker-compose up -d --build`.
8. Verify health and smoke-test, then switch DNS.

---

## 3. Redis Loss

Determine Redis's role: it is **queue infrastructure + cache + auth/rate-limit
state**, **not** permanent business data. Business data (orders, payments,
inventory) lives in MySQL and is unaffected.

1. **Restart** Redis: `docker-compose restart redis` (data volume persists).
2. If the `redis_data` volume is lost, Redis restarts empty. This is **not**
   fatal to business data but: OTPs and rate-limit state are cleared, and
   BullMQ jobs already in flight/in queues are lost.
3. **Queue recovery**: republish any important business events that were lost
   (see Queue Recovery below).
4. Do **not** treat Redis data as permanent. There is no business data to
   restore from backup in Redis.

The Redis in-memory fallback in `RedisService` keeps the API responsive, but
production should restore real Redis promptly.

---

## 4. Queue Recovery (BullMQ / Redis failure)

If Redis / BullMQ fails, jobs may be lost.

```
Jobs → failure → recovery → retry/reconciliation
```

Ensure important business events are not silently lost:

- Email jobs use a deterministic `jobId` (eventId), so an idempotent re-enqueue
  after recovery will not duplicate work.
- After Redis recovery, verify queue state via `/api/metrics` (`waiting`,
  `failed`, `delayed`).
- Re-drive business notifications (order created, payment success, etc.) by
  re-invoking the corresponding `NotificationsService` helpers if the original
  event fell into a window where Redis was unavailable.

Do **not** blindly `FLUSHALL` or `DEL` queues — recover and reconcile first.
See [RUNBOOK.md → Queue stuck](RUNBOOK.md).

---

## 5. Worker Failure

```
Worker process crashes / container restarts (restart: unless-stopped)
        │
        ▼
Container restarts automatically once health / shutdown logic allows
        │
        ▼
Verify worker readiness on port 5001 (/api/health/ready → 200 requires Redis)
        │
        ▼
Observe queue draining via /api/metrics
```

If the worker cannot restart: check logs, restart manually
(`docker-compose restart worker`), and if the code is at fault roll back the
worker image. Note the API container also instantiates the BullMQ processors,
so queues may still drain while the worker is down.

---

## 6. Application Failure

```
API / Web / Worker crashes
        │
        ▼
Container restarts (restart: unless-stopped)
        │
        ▼
Health checks re-pass
        │
        ▼
Traffic resumes
```

If the application fails at startup (e.g. env validation, missing secrets,
bad image):

1. Check logs: `docker-compose logs -f api`.
2. Confirm all required environment variables are set
   (`NODE_ENV=production`, `DATABASE_URL`, `JWT_*`, Razorpay/Brevo keys).
3. Roll back the image to the last known-good build
   (see [ROLLBACK-PLAN.md](ROLLBACK-PLAN.md)).

---

## 7. Storage Failure

The `uploads_data` volume holds product images; `mysql_data` holds the DB.
Storage failure ⇒ persistence is at risk.

1. Check disk usage and volume mounts: `docker-compose ps` + `df -h`.
2. Do **not** bring the stack down blindly — back up what is reachable first.
3. Restore the affected named volume from backup after the underlying storage
   is available again.
4. Verify static assets and served images.

---

## 8. Payment Provider Outage (Razorpay)

```
Razorpay unavailable
        │
        ▼
Do NOT fabricate success / mark payment paid / corrupt order state
        │
        ▼
Orders remain in a pending/unpaid state; retries flow through the normal
payment retry path (/payments/retry)
        │
        ▼
When Razorpay returns, verify webhooks + reconcile against provider records
        │
        ▼
Clear backlog of pending payments via safe retry / reconciliation
```

- Payments are only marked paid after signature verification / capture —
  never because a request was observed.
- Refunds also depend on Razorpay; retry after recovery and reconcile refund /
  return state.
- Provide a safe retry/recovery path. Do not corrupt order state.

See [RUNBOOK.md → Payment failures](RUNBOOK.md).

---

## 9. Email Provider Outage (Brevo)

```
Brevo unavailable
        │
        ▼
Order / Payment / Inventory flows must continue correctly
        │
        ▼
Emails are retried asynchronously via the BullMQ email queue (attempts: 3,
exponential backoff)
        │
        ▼
When Brevo returns, the queue drains and emails are delivered
```

Email is a non-critical side effect: it must never block order/payment/
inventory operations. Do not inline email delivery into financial requests.

---

## 10. Validation After Recovery

For every recovery, validate the business state:

- **Users**: login works; refresh-token rotation behaves.
- **Products**: catalogue loads; images serve.
- **Orders**: order list and status history intact.
- **Payments**: payment records consistent with Razorpay (reconcile).
- **Order items / inventory**: stock matches movements (reconcile).

Then smoke-test `/api/health`, `/api/metrics`, `/api/products`, a checkout flow
in staging, and confirm the payment/webhook test passes.

---

## 11. Post-Recovery

Run a postmortem (see [INCIDENT-RESPONSE.md](INCIDENT-RESPONSE.md)) and record
what happened, impact, timeline, root cause, detection, resolution and
preventive actions. Re-test backup/restore if the incident revealed any gap.
