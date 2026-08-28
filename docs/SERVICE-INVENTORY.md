# Service Inventory

An inventory of every service in the Beauty Queen e-commerce deployment, its
purpose, port, dependencies, health check, scaling model and criticality.

Deployment model: **single Docker host** running all containers behind one
network, fronted by Nginx / a load balancer for TLS and routing. See
[PRODUCTION-OPERATIONS.md](PRODUCTION-OPERATIONS.md).

---

## Service Table

| Service | Purpose | Port | Dependencies | Health Check | Scaling | Criticality |
|---------|---------|------|--------------|--------------|---------|-------------|
| Web (Next.js) | Frontend, SSR, static assets | 3000 | API | `GET http://localhost:3000` (docker HEALTHCHECK) | Horizontal (stateless) | High — customer-facing UI |
| API (NestJS) | REST API, auth, orders, payments, admin | 5000 | MySQL, Redis, BullMQ, Razorpay, Brevo | `/api/health`, `/api/health/live`, `/api/health/ready` | Horizontal (stateless) | **Critical** — core business logic |
| Worker (BullMQ) | Async email + in-app notifications | 5001 (health only, internal) | Redis (BullMQ), MySQL, Brevo | `/api/health/live`, `/api/health/ready` (Redis) on 5001 | Horizontal (idempotent consumers) | High — delays emails/notifications if down |
| MySQL | Relational data (users, orders, products, payments) | 3306 | — (persistent volume) | `mysqladmin ping` (docker HEALTHCHECK) | Vertical (or read replicas at scale) | **Critical** — source of truth |
| Redis | Cache, OTP, rate limit, BullMQ queue store | 6379 | — (persistent volume) | `redis-cli ping` (docker HEALTHCHECK) | Vertical (sentinel/cluster at scale) | High — queue infra + auth/rate limit |
| Nginx / Load Balancer | TLS termination, routing, static serving | 80/443 | Web, API | upstream health checks | Horizontal | High — entry point |

---

## Detail

### Web — Next.js (`apps/web`)

- **Purpose**: Customer-facing storefront: catalogue, product pages, cart,
  checkout, account, seller, admin UIs. Server-renders pages and proxies
  `/api/*` to the API.
- **Port**: 3000 (`next start --port 3000` / Docker standalone server).
- **Dependencies**: API.
- **Health check**: docker `HEALTHCHECK` on `http://localhost:3000`.
- **Scaling**: Horizontal. Stateless; customer auth is via httpOnly cookies /
  local JWT, seller tokens in localStorage. No local session state.
- **Criticality**: High.

### API — NestJS (`apps/api`)

- **Purpose**: All business logic: auth (OTP + JWT/refresh rotation), products,
  cart, checkout, orders, payments (Razorpay), refunds, returns, inventory,
  coupons, reviews, sellers, admin, analytics, invoices, audit.
- **Port**: 5000 (`PORT`).
- **Dependencies**: MySQL (Prisma), Redis (OTP/rate-limit/cache), BullMQ
  (email/notifications), Razorpay (external), Brevo (external).
- **Health check**:
  - `GET /api/health` — aggregate DB + Redis.
  - `GET /api/health/live` — liveness (dependencies not required).
  - `GET /api/health/ready` — readiness (`SELECT 1` on MySQL).
  - `GET /api/metrics` — observability.
- **Scaling**: Horizontal. Stateless; auth does not depend on local in-memory
  session state. Redis-backed rate limiting keeps limits consistent across
  instances.
- **Criticality**: **Critical**.

### Worker — BullMQ (`apps/api/src/worker.ts`)

- **Purpose**: Consumes the `email` and `notifications` BullMQ queues; sends
  transactional email via Brevo and creates in-app notifications.
- **Port**: 5001 (`WORKER_HEALTH_PORT`), health probes only — **not** exposed
  publicly.
- **Dependencies**: Redis (queue store), MySQL, Brevo.
- **Health check**:
  - `GET /api/health/live` — always OK.
  - `GET /api/health/ready` — verifies Redis (503 if down).
- **Scaling**: Horizontal. Processors are idempotent; email jobs use `jobId`
  dedupe.
- **Criticality**: High. If down, emails/notifications stop but orders and
  payments still work.

### MySQL

- **Purpose**: Source of truth. All models in `prisma/schema.prisma`.
- **Port**: 3306 (should be internal only).
- **Dependencies**: persistent `mysql_data` volume.
- **Health check**: `mysqladmin ping` (docker HEALTHCHECK).
- **Scaling**: Vertical on the single host; read replicas only at real scale.
- **Criticality**: **Critical**. Restore from backup is the recovery path.

### Redis

- **Purpose**: OTP storage, rate limiting, distributed locks, cache, BullMQ
  queue infrastructure.
- **Port**: 6379 (should be internal only).
- **Dependencies**: persistent `redis_data` volume.
- **Health check**: `redis-cli ping` (docker HEALTHCHECK).
- **Scaling**: Vertical on the single host; sentinel/cluster only at real
  scale.
- **Criticality**: High. Redis holds BullMQ jobs and auth/rate-limit state;
  queues recover via retry/reconciliation. Not the source of truth for business
  data.

### Nginx / Load Balancer

- **Purpose**: Terminates TLS, routes `example.com → web:3000` and
  `api.example.com → api:5000`, serves/ caches static assets, enforces security
  headers. (Sample config in `DEPLOYMENT.md`; not part of the Docker stack.)
- **Port**: 80/443.
- **Dependencies**: Web, API.
- **Health check**: uses upstream health checks.
- **Scaling**: Horizontal behind an external LB at scale.
- **Criticality**: High — the external entry point.
