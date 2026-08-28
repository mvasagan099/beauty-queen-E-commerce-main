# Production Operations

This document describes how the Beauty Queen e-commerce application runs in
production: the architecture, services, configuration, health checks, logging,
monitoring, backups, recovery, deployment, rollback, and incident handling.

It is the primary operations reference. Supporting documents:

- [SERVICE-INVENTORY.md](SERVICE-INVENTORY.md) — every service, its port, health check and criticality
- [DISASTER-RECOVERY.md](DISASTER-RECOVERY.md) — failure scenarios and recovery
- [INCIDENT-RESPONSE.md](INCIDENT-RESPONSE.md) — how incidents are detected and handled
- [RUNBOOK.md](RUNBOOK.md) — step-by-step procedures for common failures
- [PRODUCTION-READINESS.md](PRODUCTION-READINESS.md) — the release-gate checklist
- [BACKUP-RESTORE.md](BACKUP-RESTORE.md) — backup and restore details
- [DEPLOYMENT.md](DEPLOYMENT.md) — deployment guide and Nginx example
- [ROLLBACK-PLAN.md](ROLLBACK-PLAN.md) — rollback strategy

---

## 1. Architecture

### 1.1 Logical Deployment Architecture

The application runs as a small set of services orchestrated by `docker-compose`.
All application state lives in MySQL and Redis. The frontend and API share no
in-memory state, so multiple instances can be placed behind a load balancer.

```
                    INTERNET
                       │
                       ▼
                 DNS / HTTPS (Nginx / load balancer)
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
        Next.js #1           Next.js #2        (optional horizontal scale)
             │                   │
             └─────────┬─────────┘
                       ▼
                  NestJS API  (port 5000)
                  ┌────┼────┐
                  ▼    ▼    ▼
              MySQL  Redis  BullMQ
                       │
                       ▼
                     Worker  (port 5001 health)
                       │
                ┌──────┴──────┐
                ▼             ▼
              Brevo        In-app jobs

                    Razorpay (external)
```

### 1.2 Single Server vs Multiple Servers

The **actual** deployment is a single physical server (or single Docker host)
running the `api`, `worker`, `web`, `mysql` and `redis` containers. They share
the same physical CPU/RAM.

This is a **single-server deployment**, not true horizontal infrastructure
scaling. Running multiple API or Next.js containers on the same host still
shares one machine's resources.

For **true horizontal scaling**, separate physical servers (`Server A`,
`Server B`, `Server C`) must sit behind an appropriate load-balancing
architecture (e.g. a cloud load balancer or HAProxy), with the shared services
(MySQL, Redis) on dedicated/HA hosts. See [Scale Out](#73-scale-out) below.

> The application is **designed** to scale horizontally (stateless API, JWT
> auth via cookies, Redis-backed rate limiting) even though the current host
> runs a single instance of each service.

---

## 2. Services

A full inventory (purpose, port, dependencies, health check, scaling,
criticality) is in [SERVICE-INVENTORY.md](SERVICE-INVENTORY.md).

| Service | Container | Port | Purpose |
|---------|-----------|------|---------|
| Web | `beauty-queen-web` | 3000 | Next.js 15 frontend |
| API | `beauty-queen-api` | 5000 | NestJS REST API |
| Worker | `beauty-queen-worker` | 5001 (health) | BullMQ queue consumers |
| MySQL | `beauty-queen-mysql` | 3306 | Relational database |
| Redis | `beauty-queen-redis` | 6379 | Cache, OTP, rate limit, BullMQ |

---

## 3. Ports

| Port | Service | Notes |
|------|---------|-------|
| 3000 | web | `NEXT_PUBLIC_API_URL` targets the API |
| 5000 | api | REST API, health, metrics |
| 5001 | worker | health probes only (not public) |
| 3306 | mysql | should not be exposed publicly |
| 6379 | redis | should not be exposed publicly |
| 80/443 | Nginx / LB | external entry point (see DEPLOYMENT.md) |

Ports are the **default container ports**. Do not expose 3306/6379 to the public
internet in production.

---

## 4. Environment Variables

See `ENVIRONMENT-VARIABLES.md` (root) for the complete reference. Key variables:

| Variable | Used by | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | api, worker | MySQL connection string |
| `JWT_ACCESS_SECRET` | api, worker | Access-token signing (≥32 chars, prod-required) |
| `JWT_REFRESH_SECRET` | api, worker | Refresh-token signing (≥32 chars, prod-required) |
| `REDIS_HOST` / `REDIS_PORT` | api, worker | Redis connection |
| `REDIS_URL` | optional | Production Redis with auth/TLS (rediss://) |
| `PORT` | api | API HTTP port (default 5000) |
| `WORKER_HEALTH_PORT` | worker | Worker health port (default 5001) |
| `NODE_ENV` | all | `production` in deployments |
| `FRONTEND_URL` | api | CORS allow-list / cookie domain |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` | api | Razorpay payments + webhook |
| `BREVO_API_KEY` | api, worker | Email service |
| `LOG_LEVEL` | api, worker | pino log level (info/debug/warn/error) |
| `NEXT_PUBLIC_API_URL` | web | Where the browser calls the API |

**Production validation** (`apps/api/src/config/env.validation.ts`) hard-exits
the process when required secrets are missing or too short.

**Secrets must never** be committed to git, baked into a Docker image, placed in
the frontend bundle, or written to logs. See [Security](#7-security).

---

## 5. Database (MySQL)

- Database: `beauty_queen`, user `bq_user`.
- ORM: Prisma 5 (`prisma/schema.prisma`, 23 models).
- Migrations live in `prisma/migrations/` and are **forward-only** (see
  ROLLBACK-PLAN.md for the migration policy).
- Data volumes persist in the `mysql_data` named volume.
- Monitor: availability, connections, connection pool, query latency, errors,
  disk usage, CPU, memory. Do not expose DB health details publicly — only the
  high-level `connected`/`error` status via health readiness.

### Database Health

Prisma `$connect()` on startup and `$disconnect()` on shutdown
(`apps/api/src/prisma/prisma.service.ts`). Readiness probe runs `SELECT 1`.

---

## 6. Redis

- Container: `redis:7-alpine`, volume `redis_data`.
- Used for: OTP storage, rate limiting, distributed locks, BullMQ queue
  infrastructure, caching.
- `RedisService` (`apps/api/src/common/redis.service.ts`) has an in-memory
  fallback for resilience during development. In production, treat Redis as a
  **queue infrastructure dependency**. BullMQ data lives in Redis; losing Redis
  means republishing/requeueing is the recovery path.

**Eviction policy**: Redis data here is largely transient (OTP TTLs, rate-limit
windows, cache). BullMQ job state is recoverable via job repos/retries. Do not
rely on Redis eviction (e.g. `allkeys-lru`) to persist business-critical state —
business-critical data (orders, payments) lives in MySQL.

---

## 7. Queues (BullMQ)

Two queues are registered in `apps/api/src/common/bull.module.ts`:

| Queue | Producer | Consumer (worker) | Purpose |
|-------|----------|-------------------|---------|
| `email` | `NotificationsService.sendEmail` | `EmailProcessor` | Brevo transactional email |
| `notifications` | `NotificationsService.createInAppNotification` | `NotificationProcessor` | In-app notifications |

- Default job options: `attempts: 3`, exponential backoff `2000ms`,
  `removeOnComplete: 50`, `removeOnFail: 20`.
- Email jobs use a deterministic `jobId` (eventId) to deduplicate.

### Queue Health

Monitor for each queue: `waiting`, `active`, `completed`, `failed`, `delayed`.
Alert on abnormal queue growth (e.g. `waiting` climbing without draining, or
`failed` > threshold). The `/api/metrics` endpoint exposes these counts.

### Workers

The worker is the same NestJS application launched with the `worker.ts`
entrypoint (`node dist/worker.js`) in its own container
(`docker/worker/Dockerfile`). It wires the BullMQ consumers and exposes
liveness/readiness on `WORKER_HEALTH_PORT`.

> Note: because both `main.ts` and `worker.ts` import `AppModule`, the BullMQ
> `WorkerHost` processors are instantiated in both processes. Jobs are
> idempotent (email jobs are `jobId`-deduped) so concurrent consumption is
> safe. Both the API and worker containers act as consumers, which also
> provides a degree of redundancy.

---

## 8. External Services

| Provider | Use | Failure impact | Recovery |
|----------|-----|----------------|----------|
| Razorpay | Payments, webhooks, refunds | Orders must not be marked paid | Safe retry; do not fabricate success |
| Brevo | Transactional email | Non-fatal to orders/payments/inventory | Email retried asynchronously via queue |

See [DISASTER-RECOVERY.md](DISASTER-RECOVERY.md) for outage handling.

---

## 9. Health Checks

### API (`apps/api/src/common/health.controller.ts`)

All API health routes are under the global `/api` prefix.

| Route | Type | Meaning |
|-------|------|---------|
| `GET /api/health` | aggregate | DB + Redis status and latency; `ok`/`degraded` |
| `GET /api/health/live` | **liveness** | process is alive; does **not** depend on external dependencies |
| `GET /api/health/ready` | **readiness** | `SELECT 1` against MySQL; fails if DB unreachable |

**Liveness** must not depend on every external dependency — a crashed/leaked
process should still show liveness so an orchestrator can restart it, while
readiness gates traffic.

**Readiness** verifies MySQL because the API cannot safely serve traffic
without the database.

### Worker (`apps/api/src/worker.ts`)

- `GET /api/health/live` on `WORKER_HEALTH_PORT` (5001) — always OK.
- `GET /api/health/ready` — verifies Redis (queue dependency); 503 if down.

### Web (Next.js)

- Docker healthcheck hits `http://localhost:3000`.

Container `HEALTHCHECK`s in docker-compose handle restart/staleness detection.

---

## 10. Logging

- Backend uses **pino** (`apps/api/src/common/logger.ts`) with level from
  `LOG_LEVEL`.
- **Request ID / correlation**: `requestIdMiddleware`
  (`apps/api/src/common/request-id.middleware.ts`) honors an incoming
  `x-request-id` header (validated) or generates a UUID, and echoes it on the
  response as `x-request-id`.
- **HTTP access logs**: `LoggingInterceptor`
  (`apps/api/src/common/interceptors/logging.interceptor.ts`) logs per-request:
  `requestId`, `method`, `url`, `statusCode`, `durationMs`.
- **Errors**: `AllExceptionsFilter`
  (`apps/api/src/common/filters/all-exceptions.filter.ts`) returns a consistent
  error envelope and logs unhandled exceptions without leaking internals in
  production.

Example access log:

```
INFO request_completed requestId=... method=POST url=/api/orders status=200 durationMs=24
```

### Sensitive Data — Never Log

```
Passwords, OTP, JWT, refresh tokens, Razorpay secrets, Brevo API key,
database passwords, full card information.
```

Mask customer PII where appropriate. Never log request/response bodies of
auth, payment, or OTP endpoints.

---

## 11. Monitoring

### Endpoints

- `GET /api/health` — service health.
- `GET /api/metrics` — operational + business metrics (queues, orders, payments,
  Redis, memory, uptime).

### Metrics Tracked

- Request count / error count / latency (via logs; promote to a metrics store
  as needed).
- Queue depth per queue (`waiting`, `active`, `completed`, `failed`,
  `delayed`).
- Database latency and health.
- Payment failures / refunds.
- Business: orders (total, paid, cancelled), payments (total, successful,
  failed, refunded).
- Redis memory / connection availability.

### Golden Signals

For the major services monitor **Latency, Traffic, Errors, Saturation**.

### Latency Percentiles

Track `p50`, `p95`, `p99` — do not rely on averages alone.

### Business Metrics

Derived from real DB events (orders, payments, refunds) — never from page
views. A page visit is not an order.

### Critical Endpoint Monitoring

Prioritize the application's real money paths:

```
POST /auth/*            auth/OTP
GET  /products          catalogue
POST /cart              cart
POST /checkout/*        checkout
POST /orders            order creation
POST /payments/*        payments (incl. verification)
POST /payments/webhook  Razorpay webhook (signature verified)
GET  /orders            order listing
POST /payments/refund   refunds
```

### Alerting

Configure alerts (see [MONITORING-ALERTS](#81-monitoring-alerts)) for:
high 5xx rate, high API latency, DB/Redis unavailable, queue backlog, worker
down, payment failure spike, disk almost full, memory pressure, backup failure.
Avoid alerting on harmless warnings. See [INCIDENT-RESPONSE.md](INCIDENT-RESPONSE.md).

---

## 12. Payment Monitoring & Reconciliation

### Monitoring

Alert on: payment failure spike, verification failures, webhook failures,
webhook delay, refund failures.

**Never** mark a payment successful merely because a provider request was
observed. Success requires Razorpay signature verification and a
`payment.captured` event (or verified capture).

### Reconciliation

Periodically compare application payment/order state against **Razorpay
records**:

- Missing payment
- Duplicate payment
- Unmatched order
- Refund mismatch

Also verify the chain `Order ↔ Payment ↔ Order Items ↔ Inventory` for
inconsistent states, and compare recorded inventory vs inventory movements.

A read-only reconciliation check is provided at `scripts/reconcile.ts`
(detects unmatched/captured-without-order payments and inventory field
mismatches):

```bash
DATABASE_URL=mysql://... npx ts-node scripts/reconcile.ts   # exit 0 = clean
```

**Do not modify financial or inventory records automatically without validated
reconciliation rules.** Flag discrepancies for human review.

---

## 13. Backups

Full detail: [BACKUP-RESTORE.md](BACKUP-RESTORE.md) and the automation in
`scripts/backup.sh` / `scripts/restore.sh`.

- **Frequency**: daily (suggested 02:00 UTC).
- **Retention**: daily × 30 (suggested), plus weekly/monthly as required by the
  business. Sized to actual data volume.
- **Storage**: off-site (S3/GCS or separate server), encrypted at rest, access
  controlled, and **not publicly accessible**.
- **Backup monitoring**: a backup that silently fails is not a strategy. Track
  last success, size, duration, failures, storage availability.
- **Restore tests**: restore to an isolated environment, run migrations, start
  the app, and validate users/products/orders/payments/order items.

Automation: `scripts/backup.sh` (mysqldump via the mysql container, gzip,
retention prune) and `scripts/restore.sh` (drop/recreate/restore with a
confirmation prompt).

---

## 14. Recovery & Disaster Recovery

See [DISASTER-RECOVERY.md](DISASTER-RECOVERY.md) for procedures covering:
database loss, server loss, Redis loss, worker failure, application failure,
storage failure, payment provider outage, email provider outage.

---

## 15. Deployment

Summary (full guide: DEPLOYMENT.md):

```
Build  → Test  → Deploy  → Health check  → Smoke test  → Monitor
```

```bash
docker-compose up -d --build
docker-compose ps                     # all services healthy
curl http://localhost:5000/api/health # API healthy
curl http://localhost:5000/api/metrics
```

### Deployment Strategy

Images are built and run via docker-compose. CI (GitHub Actions) covers build,
lint and unit tests. For a production rollout, apply the smallest safe change,
verify health, then monitor.

### Zero-Downtime

Using multiple instances (web API):
```
Instance A → old version
Instance B → new version
```
requires database changes to remain **backward-compatible** during rollout.

### Database Migration Safety

For risky schema changes use expand → deploy compatible app → migrate data →
switch → contract/remove old fields later. Do **not** drop columns still used
by the previous version during a rolling deployment.

---

## 16. Rollback

Every release must have an app rollback, database strategy, worker rollback and
configuration rollback. See [ROLLBACK-PLAN.md](ROLLBACK-PLAN.md).

Database rollback is **not** as simple as reverting the application image.
Migrations are forward-only; revert schema via a documented reverse SQL or
restore from backup.

### Feature Flags

Use feature flags only for genuinely risky functionality that benefits from
gradual rollout (e.g. a new checkout, new recommendations, new promotions). Do
not build an elaborate flag platform.

---

## 17. Graceful Shutdown

- **API**: `app.enableShutdownHooks()` in `main.ts` triggers Nest lifecycle
  hooks; Prisma `onModuleDestroy` calls `$disconnect()`, Redis
  `onModuleDestroy` calls `quit()`.
- **Worker**: `worker.ts` handles `SIGTERM`/`SIGINT` (guarded), closes the
  health server, calls `app.close()` (which triggers `WorkerHost`
  `onApplicationShutdown` → BullMQ `worker.close()` graceful drain), then
  exits. Active financial operations are not terminated abruptly.
- **Web**: Next.js standalone server (`node apps/web/server.js`) exits cleanly
  on SIGTERM.

On shutdown, order: stop accepting new work → finish safe operations → close DB
→ close Redis → exit.

---

## 18. Resource Limits

Docker `deploy.resources.limits` are set per service in `docker-compose.yml`:

| Service | CPU | Memory |
|---------|-----|--------|
| mysql | 2.0 | 1G |
| api | 1.0 | 512M |
| web | 1.0 | 512M |
| worker | 0.5 | 256M |
| redis | — | — |

`restart: unless-stopped` is set for all services so crashed containers restart.

Container restart behaviour:

```
API crashes → container restarts → health check → traffic resumes
```

Repeat for worker and web.

---

## 19. Security Operations

- **HTTPS**: terminate TLS at Nginx / load balancer (see DEPLOYMENT.md).
- **Secrets**: never in git, images, frontend bundle, public env files, or logs.
- **Firewall**: restrict SSH, DB (3306) and Redis (6379) ports.
- **CORS**: strict origin allow-list (`FRONTEND_URL`) in production.
- **Rate limiting**: Redis-backed `RateLimitGuard` + OTP guard + per-route
  interceptors on auth/search/checkout.
- **Admin access**: strong auth, RBAC, audit logs, rate limiting; do not expose
  admin APIs unnecessarily.
- **Redis access**: internal only; secure with password/TLS if reachable beyond
  localhost.
- **Database access**: internal network only; least-privilege DB user.

See [SECURITY.md](SECURITY.md) and `FINAL-SECURITY-AUDIT.md` for details.

---

## 20. Environment Separation

Maintain separate config for **development / testing / staging / production**.
Never point development at production payment or database infrastructure by
accident. `NODE_ENV=production` enables strict validation and the correct CORS /
cookie security flags.

See [PRODUCTION-CHECKLIST.md](PRODUCTION-CHECKLIST.md) for the production
environment verification checklist.

---

## 21. Observability Dashboards

Wherever an observability platform is used (Prometheus/Grafana, Datadog, etc.),
create dashboards for the four golden areas:

- **API**: requests/sec, p95 latency, 5xx, 4xx.
- **Database**: connections, CPU, memory, disk, queries, latency, locks.
- **Redis**: memory, clients, commands, latency, evictions.
- **Business**: orders, revenue, payment success, refunds, cancellations,
  inventory issues, queue depth, worker failures.

---

## 22. Monitoring Alerts

Classification and priority in [INCIDENT-RESPONSE.md](INCIDENT-RESPONSE.md).
Key alert classes:

| Alert | Priority |
|-------|----------|
| Database unavailable | CRITICAL |
| Redis unavailable | CRITICAL |
| Worker down | HIGH |
| High 5xx rate | HIGH |
| High API latency (p95/p99) | HIGH |
| Queue backlog (waiting/failed growth) | HIGH |
| Payment failure / webhook spike | CRITICAL |
| Disk almost full | HIGH |
| Memory pressure | MEDIUM |
| Backup failure | HIGH |

---

## 23. Incident Response

Full procedures: [INCIDENT-RESPONSE.md](INCIDENT-RESPONSE.md). Basic flow:

```
Detect → Assess → Contain → Recover → Verify → Communicate → Postmortem
```

---

## 24. Production Commands

Runbooks with real commands are in [RUNBOOK.md](RUNBOOK.md). Index of safe
commands:

```
docker-compose up -d --build     # start / build
docker-compose stop <svc>        # stop a service
docker-compose restart <svc>     # restart a service
docker-compose logs -f <svc>     # logs
curl /api/health                 # health
npx prisma migrate deploy        # migration
bash scripts/backup.sh           # backup
bash scripts/restore.sh <file>   # restore (destructive)
node dist/worker.js              # worker
docker-compose up -d api=<tag>   # rollback
```

### Dangerous Commands

These destroy data / state and are **not** part of normal deployment:

```
docker-compose exec mysql mysql -e "DROP DATABASE beauty_queen;"
npx prisma migrate reset
npx prisma db push --force-reset
redis-cli FLUSHALL
redis-cli DEL <queue>
DEL / FLUSHDB on queue keys
docker-compose down -v            # deletes named volumes
```

Warning: `docker-compose down -v` deletes the `mysql_data`, `redis_data` and
`uploads_data` volumes. Never run it as part of normal deployment.

---

## 25. Migration Policy

Production migrations must be: reviewed, backed up where appropriate, tested on
staging, backward-compatible, and reversible (or have a recovery strategy).
See [ROLLBACK-PLAN.md](ROLLBACK-PLAN.md) and
`DATABASE-MIGRATION-MATRIX.md`.

---

## 26. Final

A deployment is only "production ready" when the application, database,
payments, infrastructure, monitoring, backup, recovery, security, and
operations all have a **defined and tested** path — not merely because
`npm run build` passes. See [PRODUCTION-READINESS.md](PRODUCTION-READINESS.md).
