# Production Readiness Checklist

This checklist captures everything that must hold before Beauty Queen can be
declared production-ready. It is the operational companion to the Phase 11
hardening work: production readiness = **functional + secure + tested +
observable + backup-ready + scalable + recoverable**.

Each item is accompanied by where it is enforced/documented so it can be
verified.

---

## Security

- [ ] No real secrets committed. Only `.env.example` (variable names) is in the
      repo; `.env`, `backend/.env`, `apps/api/.env`, `apps/web/.env.local` are
      gitignored. (`.gitignore`)
- [ ] JWT access & refresh secrets are separate and >= 32 chars
      (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`). (`config/env.validation.ts`)
- [ ] Short-lived access tokens (15m) and longer refresh tokens (7d) with
      rotation, reuse detection, revocation and logout invalidation.
      (`auth/auth.service.ts`)
- [ ] Cookies are `HttpOnly`, `Secure` (production) and `SameSite=Lax`.
      (`auth/auth.controller.ts`)
- [ ] CORS allows only trusted origins (no `*`). (`main.ts`)
- [ ] Helmet security headers enabled with a CSP that permits Razorpay but
      blocks arbitrary script sources. (`main.ts`)
- [ ] Rate limiting on OTP send/verify (email + IP) and payment endpoints.
      (`auth/guards/otp-rate-limit.guard.ts`, `payments/*`)
- [ ] All external input validated (body/query/path/headers) via global
      `ValidationPipe` + DTOs; unexpected fields rejected. (`main.ts`)
- [ ] Prisma used for DB access; no unbounded raw SQL.
- [ ] File uploads validated by size, MIME, actual signature (Sharp), image
      dimensions and count; processed through Sharp with generated safe
      filenames. (`common/image.service.ts`)
- [ ] Path traversal rejected for stored image paths. (`common/image.service.ts`)
- [ ] Payment amounts verified end-to-end (frontend -> backend -> Razorpay
      order -> verified payment match). (`payments/*`, `docs/PAYMENT.md`)
- [ ] Webhook signature validation, event ID idempotency and DB update.
      (`payments/webhook.service.ts`)
- [ ] CSRF mitigated for cookie-authenticated requests via `SameSite=Lax` +
      `HttpOnly` cookies; an optional double-submit `x-csrf-token` guard is
      provided for state-changing endpoints (see `docs/SECURITY.md`).
- [ ] Sensitive values (passwords, OTPs, tokens, secrets) never logged; error
      responses do not leak internals in production. (`common/filters/*`,
      `common/logger.ts`)

## Database

- [ ] MySQL uses strong credentials and least-privilege DB user (not root).
      (`.env.example`, `docker-compose.yml`)
- [ ] Database not publicly exposed.
- [ ] Encrypted connections where appropriate.
- [ ] Controlled migrations only (`prisma migrate deploy`) - never
      `migrate reset` against production. (`docs/DEPLOYMENT.md`)
- [ ] Indexes reviewed for hot query paths. (`docs/INDEXES.md`)
- [ ] N+1 queries reviewed in services. (`docs/INDEXES.md`)
- [ ] Backups exist with retention + off-server storage. (`docs/BACKUP-RESTORE.md`)
- [ ] Restore procedure tested. (`docs/BACKUP-RESTORE.md`)

## Authentication

- [ ] OTP flow rate-limited (send/resend/verify) per email + IP.
- [ ] Refresh token rotation works (old token invalid after use).
- [ ] Reuse of a rotated refresh token revokes all tokens for the user.
      (`auth/auth.service.ts`)
- [ ] Logout invalidates refresh tokens and clears cookies.
- [ ] Protected routes deny when not authenticated.

## Payments

- [ ] Production Razorpay keys configured (never test keys in production).
- [ ] Correct webhook URL + secret; signature verification enforced.
- [ ] Amount verification between order and captured payment.
- [ ] Duplicate/failed payment handling and idempotent webhook processing.
- [ ] Refund handling. (`docs/PAYMENT.md`, `docs/REFUND-RULES.md`)

## Email

- [ ] Production Brevo API key and verified sender identity.
- [ ] OTP / order / payment / status emails use queued worker.
      (`notifications/email/*`, `docs/EMAIL-TEMPLATES.md`)
- [ ] Brevo failures do not break order/payment flows (business op -> DB ->
      queue -> email worker). (`docs/BACKGROUND-JOBS.md`, `docs/QUEUES.md`)
- [ ] Queue retry / failed email handling.

## Storage

- [ ] Product images processed and stored under `uploads/` (local);
      production deployments mount a shared volume or move to object storage.
      (`docs/DEPLOYMENT.md`)

## Backups

- [ ] Daily backup + retention (30 days) + off-server storage.
- [ ] Verified restore procedure (test monthly on staging). (`docs/BACKUP-RESTORE.md`)

## Monitoring

- [ ] Health endpoints: `/api/health`, `/api/health/live`, `/api/health/ready`.
      (`common/health.controller.ts`)
- [ ] Worker health probes (`/api/health/live`, `/api/health/ready` on the
      worker port). (`worker.ts`)
- [ ] Structured request logging with request/correlation ID.
      (`common/request-id.middleware.ts`, `common/interceptors/logging.interceptor.ts`)
- [ ] Metrics observed: API errors, latency, DB connections, Redis, queue
      failures, payment failures, memory, CPU, disk. (`docs/DEPLOYMENT.md`)
- [ ] Error tracking (optional; must not send sensitive customer data).

## Testing

- [ ] Unit tests pass (`apps/api` jest - 6 suites). (`docs/FINAL-SECURITY-AUDIT.md`)
- [ ] Integration tests (NestJS -> Prisma -> test MySQL) configured.
- [ ] E2E flows: auth, shopping, seller, admin.
- [ ] Security tests: SQLi, XSS, JWT, refresh-token reuse, IDOR,
      rate-limit bypass, upload abuse, path traversal, unauthorized access,
      payment tampering, webhook forgery.
- [ ] CI: lint.yml (lint + typecheck), test.yml (unit), build.yml (build).
      `.github/workflows/*`

## Deployment

- [ ] Dockerfiles for web/api/worker. (`docker/*`)
- [ ] docker-compose with mysql/redis/api/worker/web + health checks.
      (`docker-compose.yml`)
- [ ] Graceful shutdown on SIGTERM/SIGINT for API and worker.
      (`main.ts`, `worker.ts`)
- [ ] Prisma connection pooling configured for scaled instances.
- [ ] HTTPS for frontend, API, webhooks, payment redirects and cookies.
- [ ] Domain strategy (`example.com` / `api.example.com`) consistent with
      cookie settings. (`docs/DEPLOYMENT.md`)
- [ ] Rollback plan documented. (`docs/ROLLBACK-PLAN.md`)

## SEO

- [ ] Titles, descriptions, canonical URLs, Open Graph on public pages.
- [ ] Sitemap for public pages; robots blocks private areas.
      (`apps/web/app/sitemap.ts`, `apps/web/app/robots.ts`, `apps/web/docs/SEO.md`)

## Performance

- [ ] Image optimization via Next.js.
- [ ] Pagination on large collections.
- [ ] Prisma `select` used to avoid over-fetching.
- [ ] Homepage / product listing / details / search / cart / checkout / admin
      measured. (`apps/web/docs/PERFORMANCE.md`)

---

## Definition of Done (presented in the phase brief)

Production-ready means all of the following simultaneously hold:

```
FUNCTIONAL
+ SECURE
+ TESTED
+ OBSERVABLE
+ BACKUP-READY
+ SCALABLE
+ RECOVERABLE
```
