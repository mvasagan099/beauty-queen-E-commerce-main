# Production Architecture

This document describes the production deployment architecture for the Beauty Queen E-Commerce application.

---

## Architecture Overview

```
                         INTERNET
                            |
                         HTTPS (443)
                            |
                         Nginx (Reverse Proxy)
                        /           \
                       /             \
             Next.js Frontend      NestJS API
              (port 3000)          (port 5000)
                   |                    |
                   |          +---------+---------+
                   |          |                   |
                   |        MySQL               Redis
                   |     (port 3306)         (port 6379)
                   |          |                   |
                   |          +---------+---------+
                   |                    |
                   |            BullMQ Worker
                   |            (port 5001)
                   |
              Shared Upload Volume
```

---

## Services

### Nginx (Reverse Proxy)

- **Image:** `nginx:1.27-alpine`
- **Container:** `beauty-queen-nginx`
- **Config:** `docker/nginx/nginx.conf`
- **Ports exposed to host:** `80`, `443`
- **Networks:** `frontend`, `backend`
- **Volumes:**
  - `./docker/nginx/nginx.conf` (read-only, config)
  - `./docker/nginx/ssl` (read-only, TLS certificates)
  - `uploads_data` at `/app/uploads` (read-only)
- **Health check:** `wget -qO- http://localhost:80/health` (every 30s, 10s timeout, 3 retries)
- **Resource limits:** 0.5 CPU, 256 MB memory
- **Responsibilities:**
  - TLS termination (TLSv1.2, TLSv1.3)
  - HTTP-to-HTTPS redirect
  - Static file serving for `/uploads/`
  - Reverse proxying `/api/*` to NestJS API
  - Reverse proxying `/api/auth/*` with stricter rate limiting
  - Reverse proxying `/api/payments/webhook` with no rate limiting
  - Reverse proxying all other routes to Next.js
  - Security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy, HSTS)
  - Gzip compression
  - Rate limiting (30 req/s general API, 5 req/s auth endpoints)
  - ACME challenge for Let's Encrypt (`/.well-known/acme-challenge/`)

### Next.js Frontend (Web)

- **Build context:** `docker/web/Dockerfile`
- **Container:** `beauty-queen-web`
- **Source:** `apps/web/`
- **Packages used:** `packages/types`, `packages/validation`, `packages/config`
- **Internal port:** `3000`
- **Networks:** `frontend`, `backend`
- **Volumes:**
  - `uploads_data` at `/app/uploads` (read-only)
- **Environment variables:**
  - `NEXT_PUBLIC_API_URL` (defaults to `/api`, resolved to `/api` in production)
  - `API_PROXY_TARGET` = `http://api:5000`
- **Health check:** `wget -qO- http://localhost:3000` (every 30s, 10s timeout, 30s start period, 3 retries)
- **Resource limits:** 1.0 CPU, 512 MB memory
- **Start command:** `node apps/web/server.js` (standalone mode)
- **Rewrites:** `/api/*` is proxied internally to `http://api:5000/api/*`
- **Key routes:** `/saree`, `/kurthi`, `/top`, `/leggin`, `/cosmetics`, `/product/:id`, `/wishlist`, `/verify`, `/contact`, `/top`, `/admin/*`, `/seller/*`

### NestJS API

- **Build context:** `docker/api/Dockerfile`
- **Container:** `beauty-queen-api`
- **Source:** `apps/api/`
- **Internal port:** `5000`
- **Networks:** `backend`
- **Volumes:**
  - `uploads_data` at `/app/uploads` (read-write)
- **Environment variables:**
  - `DATABASE_URL` = `mysql://bq_user:<MYSQL_PASSWORD>@mysql:3306/beauty_queen`
  - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
  - `REDIS_HOST` = `redis`, `REDIS_PORT` = `6379`, `REDIS_PASSWORD`
  - `PORT` = `5000`
  - `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
  - `BREVO_API_KEY`
  - `LOG_LEVEL` (defaults to `warn`)
- **Health check:** `wget -qO- http://localhost:5000/api/health/live` (every 30s, 10s timeout, 30s start period, 3 retries)
- **Resource limits:** 1.0 CPU, 512 MB memory
- **Start command:** `node apps/api/dist/main.js`
- **Modules:** Auth, Users, Products, Categories, Cart, Checkout, Orders, Payments, Sellers, Admin, Analytics, Reviews, Wishlist, Coupons, Inventory, Notifications, Alerts, Support, ScheduledJobs, Audit, Pricing, Shipping, Tax, Returns, Refunds, Invoices
- **Health endpoints:**
  - `GET /api/health` - Full health check (database + Redis connectivity with latency)
  - `GET /api/health/live` - Liveness probe (always returns 200)
  - `GET /api/health/ready` - Readiness probe (verifies database connectivity)
- **BullMQ queues registered:** `email`, `notifications`

### MySQL

- **Image:** `mysql:8.0`
- **Container:** `beauty-queen-mysql`
- **Internal port:** `3306`
- **Networks:** `backend` only (not exposed to host in production)
- **Volumes:**
  - `mysql_data` at `/var/lib/mysql`
- **Environment:**
  - `MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE` = `beauty_queen`, `MYSQL_USER` = `bq_user`, `MYSQL_PASSWORD`
  - `MYSQL_CHARSET` = `utf8mb4`, `MYSQL_COLLATION` = `utf8mb4_unicode_ci`
- **MySQL config flags:**
  - `character-set-server=utf8mb4`, `collation-server=utf8mb4_unicode_ci`
  - `innodb-buffer-pool-size=256M`
  - `max-connections=100`
  - Slow query log enabled (threshold: 2s)
  - Binary log expiration: 7 days, max size: 100 MB
- **Health check:** `mysqladmin ping -h localhost` (every 10s, 5s timeout, 5 retries, 30s start period)
- **Resource limits:** 2.0 CPU, 1 GB memory
- **Schema:** Managed via Prisma (`prisma/schema.prisma`), migrations in `prisma/migrations/`

### Redis

- **Image:** `redis:7-alpine`
- **Container:** `beauty-queen-redis`
- **Internal port:** `6379`
- **Networks:** `backend` only (not exposed to host in production)
- **Volumes:**
  - `redis_data` at `/data`
- **Config flags:**
  - Optional password authentication via `REDIS_PASSWORD`
  - `maxmemory 256mb`, eviction policy `allkeys-lru`
  - AOF persistence enabled (`appendonly yes`)
  - RDB snapshots: save every 60s if 1000+ keys changed
- **Health check:** `redis-cli ping | grep PONG` (every 10s, 5s timeout, 5 retries)
- **Resource limits:** 0.5 CPU, 256 MB memory
- **Used for:** BullMQ job queues (`email`, `notifications`), session/caching (via `RedisService`)

### BullMQ Worker

- **Build context:** `docker/worker/Dockerfile`
- **Container:** `beauty-queen-worker`
- **Source:** `apps/api/` (builds same codebase, runs `worker.js`)
- **Internal port:** `5001` (health check only)
- **Networks:** `backend`
- **Environment:**
  - Same as NestJS API, plus `WORKER_HEALTH_PORT` = `5001`
- **Health check:** `wget -qO- http://localhost:5001/api/health/live` (every 30s, 10s timeout, 30s start period, 3 retries)
- **Resource limits:** 0.5 CPU, 256 MB memory
- **Start command:** `node apps/api/dist/worker.js`
- **Responsibilities:**
  - Processes BullMQ `email` queue jobs (via `EmailProcessor` at `apps/api/src/notifications/email/email.processor.ts`)
  - Processes BullMQ `notifications` queue jobs (via `NotificationProcessor` at `apps/api/src/notifications/jobs/notification.processor.ts`)
  - Graceful shutdown: drains in-flight jobs on SIGTERM/SIGINT
- **Health probe server:** Lightweight HTTP server on port 5001 exposing `/api/health/live` and `/api/health/ready` (readiness checks Redis connectivity)

---

## Network Topology

### `frontend` Network

- **Driver:** bridge
- **Services:** Nginx, Next.js Web
- **Purpose:** Allows Nginx to reach the Next.js frontend for proxying user-facing traffic

### `backend` Network

- **Driver:** bridge, **internal: true**
- **Services:** Nginx, Next.js Web, NestJS API, MySQL, Redis, BullMQ Worker
- **Purpose:** Internal communication between all services. The `internal: true` flag prevents any direct internet access from these containers.

### Network Isolation

```
INTERNET
   |
   v
[frontend network]
   |
   +-- Nginx <---> Next.js Web
   |
[backend network] (internal, no internet)
   |
   +-- Nginx
   +-- Next.js Web
   +-- NestJS API
   +-- MySQL         (backend only, not on frontend)
   +-- Redis         (backend only, not on frontend)
   +-- BullMQ Worker (backend only, not on frontend)
```

MySQL and Redis are only on the `backend` network and are never exposed to the host or the internet in production.

---

## Data Flow

### Product Browsing

```
Browser -> Nginx (443)
            |
            +--> /api/products/* --> NestJS API (5000) --> MySQL
            |
            +--> /               --> Next.js Web (3000)
                    |
                    +--> rewrite /api/* --> NestJS API (5000) (internal)
```

1. User requests product pages via HTTPS.
2. Nginx routes `/api/*` to the NestJS API, all other routes to Next.js.
3. Next.js may also proxy `/api/*` requests internally to NestJS via the rewrite rule in `next.config.js`.
4. NestJS queries MySQL via Prisma and returns JSON responses.
5. Nginx serves cached static product images from `uploads_data` volume at `/uploads/*`.

### Checkout Flow

```
Browser -> Nginx (443) -> NestJS API (5000)
                              |
                              +--> PaymentsService.createCheckout()
                              |       --> MySQL (order, checkout, cart)
                              |
                              +--> RazorpayService.createOrder()
                              |       --> Razorpay API (external)
                              |
                              +--> Returns razorpayOrderId to client
```

1. Client calls `POST /api/payments/checkout` with address and payment method.
2. API validates inventory, calculates pricing, creates checkout record in MySQL.
3. If payment method is UPI, API creates a Razorpay order via the Razorpay SDK.
4. Razorpay order ID is returned to the client.
5. Client-side Razorpay checkout component completes payment.

### Payment Webhook

```
Razorpay -> Nginx (443)
                |
                +--> /api/payments/webhook (no rate limiting)
                        |
                        NestJS API (5000)
                        |
                        +--> WebhookService.verify()
                        |       --> Razorpay signature verification
                        |
                        +--> PaymentsService.confirmPayment()
                        |       --> MySQL (update payment status)
                        |
                        +--> BullMQ queue "email" --> Worker
                        |       --> EmailProcessor --> Brevo API
                        |
                        +--> BullMQ queue "notifications" --> Worker
                                --> NotificationProcessor --> MySQL (in-app notification)
```

1. Razorpay sends webhook POST to `/api/payments/webhook`.
2. Nginx forwards without rate limiting (Razorpay sends bursts).
3. API verifies the webhook signature using `RAZORPAY_WEBHOOK_SECRET`.
4. On success, updates payment and order status in MySQL.
5. Enqueues email job to the `email` BullMQ queue.
6. Enqueues notification job to the `notifications` BullMQ queue.
7. Worker processes both queues: sends transactional email via Brevo and creates in-app notification records in MySQL.

### Email Sending

```
NestJS API or Worker -> BullMQ "email" queue (Redis)
                              |
                              Worker (apps/api/dist/worker.js)
                              |
                              +--> EmailProcessor
                              |       --> Brevo API (external SMTP/REST)
                              |
                              +--> Email templates (apps/api/src/notifications/templates/)
```

1. Services enqueue email jobs via `@nestjs/bullmq` to the `email` queue stored in Redis.
2. Worker picks up jobs from the queue.
3. `EmailProcessor` renders the appropriate template and sends via the Brevo API.
4. Default job options: 3 attempts, exponential backoff (2s base), 50 completed jobs retained, 20 failed jobs retained.

---

## Port Mapping

| Service          | Internal Port | Host Port (Production) | Host Port (Development) |
|------------------|---------------|------------------------|-------------------------|
| Nginx            | 80, 443       | **80, 443**            | N/A                     |
| Next.js Web      | 3000          | Not exposed            | 3000                    |
| NestJS API       | 5000          | Not exposed            | 5000                    |
| MySQL            | 3306          | Not exposed            | 3306                    |
| Redis            | 6379          | Not exposed            | 6379                    |
| BullMQ Worker    | 5001          | Not exposed            | 5001                    |

In production, only ports 80 and 443 are exposed to the host. All internal communication occurs over Docker bridge networks.

---

## Volume Mounts

| Volume Name     | Mounted At          | Services Using It          | Purpose                                      |
|-----------------|---------------------|----------------------------|----------------------------------------------|
| `mysql_data`    | `/var/lib/mysql`    | MySQL                      | Persistent database storage                  |
| `redis_data`    | `/data`             | Redis                      | Persistent AOF/RDB cache storage             |
| `uploads_data`  | `/app/uploads`      | NestJS API (rw), Next.js Web (ro), Nginx (ro) | Shared product image uploads |

The `uploads_data` volume is shared across three services:
- **NestJS API** mounts it read-write so sellers/admins can upload product images.
- **Next.js Web** mounts it read-only for server-side image rendering (e.g., `next/image`).
- **Nginx** mounts it read-only to serve static files directly at `/uploads/*`.

---

## Build Pipeline

All application images use multi-stage Docker builds based on `node:20-alpine`.

### API (`docker/api/Dockerfile`)

1. **Builder stage:** Installs dependencies (`npm ci`), copies source, generates Prisma client, runs `npm run build`.
2. **Runner stage:** Installs production dependencies only (`npm ci --omit=dev`), copies compiled output (`dist/`), Prisma client binaries, creates `/app/uploads/products` directory, runs as non-root user `app` (UID 1001). Entrypoint: `node apps/api/dist/main.js` via `tini`.

### Web (`docker/web/Dockerfile`)

1. **Deps stage:** Installs dependencies.
2. **Builder stage:** Copies dependencies, copies source and `packages/`, runs `npm run build` with `OUTPUT_STANDALONE=true`.
3. **Runner stage:** Copies standalone build output, public directory, and `.next/static`. Runs as non-root user `nextjs` (UID 1001). Entrypoint: `node apps/web/server.js` via `tini`.

### Worker (`docker/worker/Dockerfile`)

1. **Builder stage:** Same as API -- installs dependencies, generates Prisma client, builds.
2. **Runner stage:** Same as API -- production deps only, compiled output, Prisma binaries. Runs as non-root user `app` (UID 1001). Entrypoint: `node apps/api/dist/worker.js` via `tini`.

All images use `tini` as PID 1 for proper signal handling and zombie process reaping.

---

## Health Check Chain

```
Nginx (port 80/443)
  |
  +--> depends_on: Web (service_healthy), API (service_healthy)
  |    health: wget -qO- http://localhost:80/health
  |
  +--> Next.js Web (port 3000)
  |    depends_on: API (service_healthy)
  |    health: wget -qO- http://localhost:3000
  |
  +--> NestJS API (port 5000)
  |    depends_on: MySQL (service_healthy), Redis (service_healthy)
  |    health: wget -qO- http://localhost:5000/api/health/live
  |    readiness: GET /api/health/ready (checks MySQL SELECT 1)
  |    full: GET /api/health (checks MySQL + Redis with latency)
  |
  +--> MySQL (port 3306)
  |    health: mysqladmin ping -h localhost
  |    start_period: 30s
  |
  +--> Redis (port 6379)
  |    health: redis-cli ping | grep PONG
  |
  +--> BullMQ Worker (port 5001)
       depends_on: MySQL (service_healthy), Redis (service_healthy)
       health: wget -qO- http://localhost:5001/api/health/live
       readiness: GET /api/health/ready (checks Redis connectivity)
```

Startup order enforced by `depends_on` with `condition: service_healthy`:

1. MySQL and Redis start first.
2. NestJS API waits for both to be healthy, then starts.
3. BullMQ Worker waits for both to be healthy, then starts.
4. Next.js Web waits for NestJS API to be healthy, then starts.
5. Nginx waits for both Web and API to be healthy, then starts.

---

## Resource Allocation

| Service          | CPU Limit | Memory Limit | Priority                  |
|------------------|-----------|--------------|---------------------------|
| MySQL            | 2.0       | 1 GB         | Highest (data layer)      |
| NestJS API       | 1.0       | 512 MB       | High (request handling)   |
| Next.js Web      | 1.0       | 512 MB       | High (SSR + static)       |
| Redis            | 0.5       | 256 MB       | Medium (caching/queues)   |
| BullMQ Worker    | 0.5       | 256 MB       | Medium (async processing) |
| Nginx            | 0.5       | 256 MB       | Medium (proxy/lightweight)|
| **Total**        | **5.5**   | **2.75 GB**  |                           |

---

## Deployment

### Production

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

### Development

```bash
docker compose up -d
```

### Key Production Differences from Development

| Aspect              | Development               | Production                              |
|---------------------|---------------------------|-----------------------------------------|
| MySQL port          | Exposed on host (3306)    | Not exposed                             |
| Redis port          | Exposed on host (6379)    | Not exposed                             |
| API port            | Exposed on host (5000)    | Not exposed                             |
| Web port            | Exposed on host (3000)    | Not exposed                             |
| Nginx               | Not included              | Included, ports 80/443 exposed          |
| Networks            | Single `backend` bridge   | `frontend` (bridge) + `backend` (internal) |
| TLS                 | None                      | SSL certificates via `docker/nginx/ssl/` |
| Rate limiting       | None                      | 30 req/s API, 5 req/s auth              |
| Health checks       | Basic                     | Full chain with `service_healthy` conditions |
| Resource limits     | None                      | CPU and memory limits on all services   |
| Logging             | Default                   | Configurable `LOG_LEVEL`                |

---

## Security

- All services run as non-root users (UID 1001).
- MySQL and Redis are never exposed to the host or internet.
- TLS termination at Nginx with TLSv1.2 and TLSv1.3 only.
- Security headers injected by both Nginx and Next.js.
- Webhook endpoint (`/api/payments/webhook`) bypasses rate limiting but verifies Razorpay signatures.
- Auth endpoints have stricter rate limiting (5 req/s vs 30 req/s general API).
- Rate limiting is per-client-IP using `$binary_remote_addr`.
- Request IDs (`X-Request-Id`) propagated from Nginx through to upstream services.
- Dotfiles blocked by Nginx (except `.well-known` for ACME).
- CORS configured via `FRONTEND_URL` environment variable.
- CSRF protection via dedicated `CsrfModule`.
- JWT-based authentication with access and refresh tokens.
- Job retry: 3 attempts with exponential backoff (2s base delay).

---

## File Reference

| Path                                          | Description                              |
|-----------------------------------------------|------------------------------------------|
| `docker-compose.prod.yml`                     | Production Docker Compose config         |
| `docker-compose.yml`                          | Development Docker Compose config        |
| `docker/nginx/nginx.conf`                     | Nginx configuration                      |
| `docker/api/Dockerfile`                       | NestJS API multi-stage Dockerfile        |
| `docker/web/Dockerfile`                       | Next.js Web multi-stage Dockerfile       |
| `docker/worker/Dockerfile`                    | BullMQ Worker multi-stage Dockerfile     |
| `apps/api/src/main.ts`                        | NestJS API entrypoint                    |
| `apps/api/src/worker.ts`                      | BullMQ Worker entrypoint                 |
| `apps/api/src/app.module.ts`                  | Root NestJS module                       |
| `apps/api/src/common/health.controller.ts`    | Health check endpoints                   |
| `apps/api/src/common/bull.module.ts`          | BullMQ/Redis queue configuration         |
| `apps/api/src/notifications/email/email.processor.ts`   | Email queue processor     |
| `apps/api/src/notifications/jobs/notification.processor.ts` | Notification queue processor |
| `apps/web/next.config.js`                     | Next.js config (rewrites, headers)       |
| `apps/web/lib/api.ts`                         | Client-side API client                   |
| `prisma/schema.prisma`                        | Database schema                          |
| `prisma/migrations/`                          | Database migrations                      |
| `.env.production.example`                     | Production environment variables template |
