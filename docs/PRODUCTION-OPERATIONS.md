# Production Operations Guide

**Version:** v2.0.0
**Last Updated:** 2026-09-04

---

## Architecture

```
Internet → HTTPS → Nginx (80/443)
                        ├── /api/*      → NestJS API (port 5000)
                        ├── /uploads/*  → Static file serving
                        └── /*          → Next.js Frontend (port 3000)

Internal Services:
  MySQL 8.0 (port 3306, internal network only)
  Redis 7  (port 6379, internal network only)
  BullMQ Worker (port 5001 health probe, internal network only)
```

## Deployment Process

### Automated (Recommended)

Push to `main` branch triggers `.github/workflows/deploy.yml`:
1. CI checks pass (lint, test, build)
2. Docker images built and pushed to GHCR
3. Staging deployment + smoke tests
4. Production backup + deployment + health checks

### Manual

On the production server:

```bash
cd /opt/beauty-queen

# Pull latest
git pull origin main

# Backup database
MYSQL_ROOT_PASSWORD="<password>" bash scripts/backup.sh /var/backups/beauty-queen

# Build and deploy
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d --remove-orphans

# Run migrations
docker compose -f docker-compose.prod.yml exec -T api npx prisma migrate deploy --schema=../../prisma/schema.prisma

# Verify health
curl -sf http://localhost/api/health/live
curl -sf http://localhost/api/health/ready
curl -sf http://localhost/
```

## Environment Variables

### Backend (NestJS API)

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | `mysql://user:pass@mysql:3306/beauty_queen` |
| `JWT_ACCESS_SECRET` | Yes | `openssl rand -base64 48` |
| `JWT_REFRESH_SECRET` | Yes | `openssl rand -base64 48` |
| `RAZORPAY_KEY_ID` | Yes (prod) | Live key from Razorpay dashboard |
| `RAZORPAY_KEY_SECRET` | Yes (prod) | Live secret from Razorpay dashboard |
| `RAZORPAY_WEBHOOK_SECRET` | Yes (prod) | Webhook secret from Razorpay dashboard |
| `BREVO_API_KEY` | Recommended | API key from Brevo |
| `REDIS_HOST` | Yes | `redis` (Docker service name) |
| `REDIS_PORT` | Yes | `6379` |
| `REDIS_PASSWORD` | Recommended | Strong password |
| `PORT` | Yes | `5000` |
| `NODE_ENV` | Yes | `production` |
| `FRONTEND_URL` | Yes | `https://your-domain.com` |
| `LOG_LEVEL` | Yes | `info` or `warn` |
| `WORKER_HEALTH_PORT` | Yes | `5001` |

### Frontend (Next.js)

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_API_URL` | Yes | `/api` (proxied through Nginx) |
| `API_PROXY_TARGET` | Yes | `http://api:5000` |

### Database (MySQL)

| Variable | Required | Notes |
|----------|----------|-------|
| `MYSQL_ROOT_PASSWORD` | Yes | Strong password |
| `MYSQL_PASSWORD` | Yes | Application user password |

### Redis

| Variable | Required | Notes |
|----------|----------|-------|
| `REDIS_PASSWORD` | Recommended | Strong password |

## Database Migration

```bash
# Check status
docker compose exec -T api npx prisma migrate status --schema=../../prisma/schema.prisma

# Deploy pending migrations
docker compose exec -T api npx prisma migrate deploy --schema=../../prisma/schema.prisma

# Generate Prisma client
docker compose exec -T api npx prisma generate --schema=../../prisma/schema.prisma
```

**NEVER run `prisma migrate dev` or `prisma db push` in production.**

## Backup Process

```bash
MYSQL_ROOT_PASSWORD="<password>" bash scripts/backup.sh /var/backups/beauty-queen
```

- Creates timestamped gzipped SQL dump
- Maintains `latest.sql.gz` pointer
- Cleans up backups older than 30 days

## Restore Process

```bash
bash scripts/restore.sh /var/backups/beauty-queen/latest.sql.gz
```

**WARNING:** Destructive. Drops and recreates the database.

## Monitoring

### Health Endpoints

- `GET /api/health` — Combined health status
- `GET /api/health/live` — Liveness probe (always 200 if process running)
- `GET /api/health/ready` — Readiness probe (checks DB + Redis)

### Docker Health Checks

All services have Docker health checks configured:
- MySQL: `mysqladmin ping` every 10s
- Redis: `redis-cli ping` every 10s
- API: `wget /api/health/live` every 30s
- Web: `wget /` every 30s
- Worker: `wget /api/health/live` on port 5001 every 30s

### Key Metrics to Watch

- HTTP 5xx rate
- API response latency (p50, p95, p99)
- MySQL connection count
- Redis memory usage
- BullMQ queue depth
- BullMQ failed job count
- Disk usage (uploads, logs, backups)
- Container CPU/memory usage

## Logging

- Backend: Pino structured JSON logs
- Frontend: Next.js server logs
- Nginx: Access and error logs

Log levels: `fatal`, `error`, `warn`, `info`, `debug`, `trace`

Production recommendation: `info` or `warn`.

## Incident Response

1. Check health endpoints
2. Check container status: `docker compose -f docker-compose.prod.yml ps`
3. Check logs: `docker compose -f docker-compose.prod.yml logs --tail=100 <service>`
4. Check database: `docker compose exec -T mysql mysql -u root -p"<password>" beauty_queen`
5. Check Redis: `docker compose exec -T redis redis-cli -a "<password>" info`

For P0 incidents, see `INCIDENT-RESPONSE.md`.

## Rollback

See `ROLLBACK.md` for complete rollback procedure.

## Scaling

Current architecture supports vertical scaling. For horizontal scaling:

1. API: Increase replicas behind Nginx upstream
2. Worker: Scale BullMQ workers (automatic distribution)
3. Frontend: Stateless, scale freely
4. Database: Read replicas for read-heavy workloads
5. Redis: Redis Cluster for high availability

## Maintenance

### Regular Tasks

- **Daily:** Check monitoring dashboards
- **Weekly:** Review error logs, check backup integrity
- **Monthly:** Review security patches, update dependencies
- **Quarterly:** Performance review, capacity planning

### Scheduled Jobs

- Abandoned cart reminders: `30 2 * * *` (2:30 AM UTC)
- Coupon auto-expiry: `30 0 * * *` (12:30 AM UTC)
