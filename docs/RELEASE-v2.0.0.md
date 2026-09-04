# Release v2.0.0 — Production Launch

**Release Date:** 2026-09-04
**Version:** v2.0.0
**Codename:** Beauty Queen E-Commerce Platform

---

## Release Summary

v2.0.0 is the initial production release of the Beauty Queen E-Commerce platform, representing a complete rewrite from the legacy v0.1.0 Express+Handlebars application to a modern Next.js 15 + NestJS 10 monorepo architecture.

## Scope

### Applications
- **Frontend** (`apps/web`): Next.js 15.1.4, React 19, Tailwind CSS, Zustand, React Query
- **Backend API** (`apps/api`): NestJS 10.4, Prisma 5.22, MySQL 8.0, Redis 7, BullMQ
- **Worker** (`apps/api/dist/worker.js`): BullMQ consumer for email + notification queues

### Infrastructure
- Docker multi-stage builds (api, web, worker)
- Nginx reverse proxy with SSL termination, rate limiting, security headers
- MySQL 8.0 with utf8mb4, tuned configuration
- Redis 7 with persistence, LRU eviction
- GitHub Actions CI/CD pipeline (CI + staging + production deploy)

### Key Features
- Full product catalog with categories (Saree, Cosmetics, Kurti, Leggings, Tops)
- User authentication (OTP-based email verification)
- Seller registration and management
- Shopping cart with persistence
- Razorpay payment integration (UPI + COD)
- Order management with status tracking
- Coupon system with auto-expiry
- Review and rating system
- Wishlist functionality
- Admin dashboard (products, orders, users, analytics, coupons, refunds, returns)
- Inventory management with stock alerts
- Email notifications via Brevo
- In-app notifications
- Support ticket system
- Search with logging
- Audit logging
- Address management
- Invoice generation
- Abandoned cart recovery
- Price alerts
- CORS, CSRF, rate limiting, security headers

### Packages
- `@beauty-queen/types` — shared TypeScript types
- `@beauty-queen/config` — shared constants
- `@beauty-queen/validation` — shared Zod schemas

## Pre-release Verification

| Check | Status |
|-------|--------|
| API build | PASS |
| Web build | PASS |
| API lint | PASS |
| Web lint | PASS |
| API tests (147) | PASS |
| Prisma schema valid | PASS |
| Docker configs validated | PASS |
| Nginx config validated | PASS |
| CI workflow validated | PASS |
| Deploy workflow validated | PASS |

## Release Branch

- **Branch:** `main`
- **Commit:** 93ee519 (base) + uncommitted Phase 25 changes
- **Tag:** `v2.0.0`

## Known Limitations at Launch

1. No production server provisioned in this environment
2. No Docker runtime available on build machine
3. No production `.env.production` file created
4. No DNS/SSL configured
5. CI/CD secrets (SSH keys, production host) not configured in GitHub

These are **infrastructure requirements**, not code issues.

## Rollback Plan

See `docs/ROLLBACK.md` for the complete rollback procedure.

## Documentation

All documentation files are in `docs/`. Key files:
- `PRODUCTION-OPERATIONS.md` — operational procedures
- `ROLLBACK.md` — rollback procedure
- `PRODUCTION-ARCHITECTURE.md` — architecture overview
- `PRODUCTION-RUNBOOK.md` — incident runbook
- `GO-LIVE-CHECKLIST.md` — go-live checklist
