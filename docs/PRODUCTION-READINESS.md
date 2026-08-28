# Production Readiness

The release-gate checklist for the Beauty Queen e-commerce application. A
deployment is **not** production-ready merely because `npm run build` passes.
Production readiness means the application, database, payments, infrastructure,
monitoring, backup, recovery, security, and operations all have a **defined and
tested** path.

Mark each item and confirm the evidence.

---

## Infrastructure

- [ ] Single Docker host provisioned with Docker + Docker Compose.
- [ ] `docker-compose config` validates.
- [ ] DNS + SSL/TLS (Let's Encrypt / provider) configured (see DEPLOYMENT.md).
- [ ] Nginx / load balancer terminates TLS; HTTP → HTTPS redirect.
- [ ] Firewall restricts SSH, 3306, 6379 from public access.
- [ ] Resource limits set per service (see PRODUCTION-OPERATIONS.md).
- [ ] `restart: unless-stopped` on all services.
- [ ] Uploads persisted in `uploads_data` named volume (not ephemeral).

## Database

- [ ] MySQL reachable; `prisma migrate status` clean.
- [ ] Health readiness passes (`/api/health/ready` → ok).
- [ ] Connection pool sized sensibly; no leak observed.
- [ ] Reversible / forward-only migrations tested on staging.
- [ ] Restore verified on an isolated environment in the last N days.

## Redis

- [ ] Redis reachable; `redis-cli ping` → PONG.
- [ ] Memory/eviction policy appropriate (ephemeral cache + queue infra).
- [ ] Redis not reachable publicly.

## Workers / Queues

- [ ] Worker health on 5001 passes (`/api/health/live`, `/api/health/ready`).
- [ ] `email` and `notifications` queues drain (watch `/api/metrics`).
- [ ] Queue backlog / failed-job alerts configured.
- [ ] Graceful shutdown verified (SIGTERM drains active jobs).

## Authentication

- [ ] OTP login end-to-end passes.
- [ ] JWT access/refresh rotation + reuse detection works.
- [ ] Refresh tokens are cookies (httpOnly, secure, SameSite) in production.
- [ ] Rate limiting on auth/search/checkout/payments active.

## Payments

- [ ] Razorpay order creation + signature verification passes.
- [ ] Webhook delivery to `/api/payments/webhook` is signature verified.
- [ ] Payment never marked success without capture/verification.
- [ ] Refund/return flow works end-to-end.
- [ ] Payment failure / webhook alerts configured.
- [ ] Reconciliation process documented and run.

## Security

- [ ] `NODE_ENV=production` — strict env validation, correct CORS/cookies.
- [ ] Secrets not in git, images, frontend bundle, public env files, or logs.
- [ ] CORS allow-list correct; admin APIs not needlessly exposed.
- [ ] Helmet + security headers applied (API and web).
- [ ] RBAC + audit logging for admin/seller actions.
- [ ] Webhook signature verification; IDOR/authorization checks pass.
- [ ] No secrets in logs; sensitive fields never logged.

## Backups

- [ ] Backup job runs on schedule (`scripts/backup.sh`).
- [ ] Retention defined (daily/weekly/monthly) and sized to business need.
- [ ] Backup storage encrypted, access-controlled, not publicly accessible.
- [ ] Backup monitoring active (last success, size, duration, failures).

## Restore

- [ ] Restore tested to isolated environment in the last N days.
- [ ] Post-restore data validated: users, products, orders, payments,
      order items.
- [ ] Recovery procedure documented and rehearsed (DISASTER-RECOVERY.md).

## Monitoring

- [ ] `/api/health`, `/api/health/live`, `/api/health/ready` working.
- [ ] `/api/metrics` working (queues, orders, payments, redis, memory).
- [ ] Golden signals (latency/traffic/errors/saturation) observable.
- [ ] p50/p95/p99 latency tracked (not just averages).

## Alerts

- [ ] CRITICAL: DB/Redis unavailable, payment/webhook spike, backup failure.
- [ ] HIGH: 5xx rate, p95/p99 latency, queue backlog, worker down, disk full.
- [ ] Alert priorities classified; no alerting on harmless warnings.

## CI / CD

- [ ] CI runs build, lint, typecheck, unit tests (GitHub Actions).
- [ ] Production build passes (`npm run build` for api + web).
- [ ] E2E / smoke test passes (health, products, cart, checkout, payment test).
- [ ] Deployment procedure documented and rehearsed.

## Rollback

- [ ] Application rollback documented (ROLLBACK-PLAN.md).
- [ ] Database strategy documented (forward-only + reverse/recovery).
- [ ] Worker rollback documented.
- [ ] Configuration (env) rollback documented.

## Documentation

- [ ] PRODUCTION-OPERATIONS.md current.
- [ ] SERVICE-INVENTORY.md current.
- [ ] DISASTER-RECOVERY.md current.
- [ ] INCIDENT-RESPONSE.md current (with owners).
- [ ] RUNBOOK.md current.

---

## Release Gate

**Production deployment is allowed only when ALL of the following hold:**

```
P0 issues                        = 0
Critical security issues         = 0
Backup verified                  = yes
Restore verified                 = yes
Health checks pass               = [api /health, /health/live, /health/ready, worker]
Payment test passes              = [Razorpay create + verify + webhook]
E2E passes                       = [build, lint, typecheck, unit, smoke]
Production build passes          = [api + web]
Rollback plan documented         = yes
Monitoring active                = yes
```

---

## Final Sign-off

| Check | Result | Date | Verified by |
|-------|--------|------|-------------|
| Infrastructure | | | |
| Database | | | |
| Redis | | | |
| Workers / Queues | | | |
| Authentication | | | |
| Payments | | | |
| Security | | | |
| Backups | | | |
| Restore | | | |
| Monitoring | | | |
| Alerts | | | |
| CI/CD | | | |
| Rollback | | | |
| Documentation | | | |
