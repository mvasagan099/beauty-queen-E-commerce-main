# Final Bug Report — Beauty Queen E-commerce

Consolidated report of defects found and dispositioned during the final
sweeps. Phase 17 (2026-08-28) and Phase 20 production-hardening (2026-08-28).
Severity: **P0** = blocks production deploy, **P1** = functional break for a
role/route / security, **P2** = correctness/hygiene.

---

## Phase 20 hardening fixes (this cycle)

| ID | Severity | Area | Description | Resolution |
|----|----------|------|-------------|------------|
| BQ-101 | P1 | Auth | Customer `logout` revoked **all** refresh tokens because it used `req.user.id` (undefined) instead of `req.user.sub`; it also relied on a hardcoded-logout path. | Use `req.user.sub`; pass `{ path: '/' }` to clearCookie (aligned with seller logout). |
| BQ-102 | P1 | Sellers | `sellers.service.login` silently fell back to predictable `'access-secret'`/`'refresh-secret'` when env secrets missing. | Throw `UnauthorizedException('JWT secrets not configured')` if either secret is unset. |
| BQ-103 | P0 | Authz (IDOR) | Customer-scoped controllers (users, cart, wishlist, checkout, notifications, orders, reviews, returns, refunds, invoices, payments, auth/me, auth/logout) were auth-gated but **not role-gated** — any authenticated role (e.g., a seller) could read/write customer resources. | Class-level `RolesGuard` + `@Roles(CUSTOMER)` on each; ADMIN retained where admin actions exist. |
| BQ-104 | P2 | Redis | `redis.service` / BullMQ connection had no password/TLS/URL support (unauthenticated Redis only). | `REDIS_URL`, `REDIS_PASSWORD`, `REDIS_TLS` supported in `redis.service` + `bull.module`; zod schema + `.env.example` + docker-compose wired. |
| BQ-105 | P2 | Rate limiting | Seller `signup`/`login`, `/auth/refresh`, and `checkout/*` were not rate-limited (brute-force / abuse). | `RateLimitGuard` registered and applied with per-route limits; guards provided in the owning modules. |
| BQ-106 | P1 | Coupons | `consumeCoupon` only linked a pre-existing usage row and **never incremented `usedCount`/enforced limits** on the payments checkout path, so coupon usage limits were not enforced (financial). | Rewritten to record usage atomically: lock coupon row, enforce `usageLimit` + `perUserLimit`, create usage + increment `usedCount` or link the pending row, inside a transaction. |
| BQ-107 | P2 | Metrics | `/api/metrics` (business order/payment volumes) was public. | Restricted to ADMIN. |
| BQ-108 | P2 | Products | Multipart create/update accepted `NaN` and negative size quantities. | Coerce via non-negative-int helpers + `areSizesValid` guard. |
| BQ-109 | P2 | Docs | `FINAL-SECURITY-AUDIT.md` contained stale FAIL/high findings contradicted by current code. | Rewritten with evidence-verified status; stale items confirmed fixed. |

## Phase 19 final audit fixes (this cycle)

Final product-intelligence / production-readiness sweep (2026-08-28). Confirmed
defects found by re-inspecting the live source (not trusting prior doc claims)
and their resolutions.

| ID | Severity | Area | Description | Resolution |
|----|----------|------|-------------|------------|
| BQ-110 | P0 | Authz (seller IDOR) | `GET seller/orders/:id` (`seller-orders.controller.ts`) called the unscoped `ordersService.getOrderById(id)`, so **any seller could read any order** including another seller's customer PII. Prior docs claimed this was scoped, but the code was not. | Added `OrdersService.getSellerOrder(id, sellerId)` scoped via `findFirst({ where: { id, sellerId } })` (mirrors `updateOrderStatusBySeller`); controller passes `req.user.sub`. Non-owned orders 404. |
| BQ-111 | P1 | Authz (customer IDOR) | `GET orders/:id/history` (`orders.controller.ts`) called the unscoped `getStatusHistory(id)`, so **any authenticated user could read any order's status history**. | `getStatusHistory(id, user?)` now enforces ownership (userId or email match, same as `getCustomerOrder`) when a user is supplied; the ADMIN controller keeps its existing ADMIN-role gate by calling without a user. |
| BQ-112 | P2 | Tests | `search.service.spec.ts` mocked only `product.findMany/count` but `SearchService.search` uses `prisma.$queryRaw`; 5 tests failed with `$queryRaw is not a function`. | Rewrote the spec to accurately test the `$queryRaw`-backed implementation (ranked products, contains count, clamp/truncate) so its assertions match the real code. |
| BQ-113 | P0 | Web deploy (Docker) | `docker/web/Dockerfile` depends on the standalone output (copies `.next/standalone`, runs `node apps/web/server.js`) but never set `OUTPUT_STANDALONE=true`, so the Docker web image build produced **no standalone output** and the `COPY`/runtime CMD would fail. Also, standalone `next build` intermittently aborted (`copyfile ... ENOENT`) due to flaky Next 15 monorepo trace collection. | Set `ENV OUTPUT_STANDALONE=true` in the Dockerfile builder stage; wrapped `next build` in `apps/web/scripts/build-standalone.mjs` (clean `.next` + retry up to 4×) so the standalone output is produced deterministically (`apps/web/server.js` verified). |

## Phase 17 fixes (prior cycle)

## 1. Fixed this audit

| ID | Severity | Area | Description | Resolution |
|----|----------|------|-------------|------------|
| BQ-001 | P0 | Prisma migrations | `prisma/migrations` contained only incremental patches; no initial migration. Fresh `prisma migrate deploy` created only ~7 auxiliary tables (orders, products, users, cart, etc. absent). | Generated authoritative baseline `20260828000000_init/migration.sql` (20 core tables + advanced tables, enums, indexes) + `migration_lock.toml`; removed the stale incremental chain. |
| BQ-002 | P0 | Prisma client | `prisma generate` wrote to root `node_modules`; `apps/api` resolved a fallback shim without `Role`, `OrderStatus`, model exports (runtime break on first `@prisma/client` use). | Set generator `output = "../apps/api/node_modules/.prisma/client"`; `prisma generate` re-run, API build/typecheck/tests green. |
| BQ-003 | P0 | API build | `orders.service.ts` referenced `CreateOrderDto` without importing it → `nest build` failed. | Import added; build passes. |
| BQ-004 | P1 | Seller UI | `/seller` (root) returned 404 for authenticated sellers (no page). | Added `apps/web/app/seller/page.tsx` redirecting to `/seller/dashboard`. |
| BQ-005 | P1 | Seller UI | No seller profile page and no sidebar entry. | Added `apps/web/app/seller/profile/page.tsx` (view/update name, email, mobile, password) + Profile sidebar item. |
| BQ-006 | P1 | Admin UI | `admin/audit-logs` made a raw `fetch("http://localhost:5000/api/admin/audit-logs", ...)` ignoring `NEXT_PUBLIC_API_URL`. | Added `adminApi.auditLogs` to `apps/web/lib/api.ts`; page now uses the shared client with credentials. |
| BQ-007 | P1 | Code cleanliness | Dead, unreachable files: `apps/web/app/product/[id]/product-detail-client.tsx`, `apps/web/services/server-product.service.ts` (no imports anywhere). | Deleted both; web build verifies no dangling references. |
| BQ-008 | P2 | Shared types | `packages/types#OrderStatus` lacked `Confirmed`; `packages/validation#updateOrderStatusSchema` rejected it. | Synced to full Prisma enum (`Pending, Confirmed, Processing, Shipped, Delivered, Cancelled, Refunded`). |

## 2. Investigated and marked not-a-bug (audit corrections)

| Claim | Finding |
|-------|---------|
| `.env` files staged in git | Only `.env.example` is tracked (`git ls-files`). No secrets staged. |
| Weak JWT secrets in `.env.example` | Secrets are blank; `env.validation.ts` requires `min(32)`; auth module/strategy throw if missing; no `'access-secret'`-style fallbacks remain. |
| `db:seed` points to missing `prisma/seed.ts` | Points to `node prisma/seed.js` which exists. |
| Broken `/admin/orders/dashboard` link | Current source links `/admin/orders` → `/admin/dashboard`; all admin sidebar links resolve. |
| Seller routes unreachable (middleware cookie) | `/sellers/login` sets the `access_token` httpOnly cookie (host-only, so visible across ports) → middleware guard works. |

## 3. Known limitations (accepted, documented)

| ID | Severity | Description | Tracking |
|----|----------|-------------|----------|
| KL-1 | P1 | Frontend E2E / automated UI tests not implemented | `docs/MISSING-FEATURES.md` |
| KL-2 | P2 | Checkout saved-address selector not built | `docs/MISSING-FEATURES.md` |
| KL-3 | P2 | Each line item is a separate `Order` row (no grouping) | `docs/MISSING-FEATURES.md` |
| KL-4 | P2 | No stock reservation/rollback lifecycle | `docs/MISSING-FEATURES.md` |
| KL-5 | P2 | Local filesystem image storage (`uploads/`) — scaling needs shared volume/object storage | `docs/DEPLOYMENT.md` |
| KL-6 | P2 | Full-stack runtime (Docker/MySQL/Redis), fresh-DB migration apply, load and backup-restore not executable in this environment | `docs/PROJECT-COMPLETION-REPORT.md` |

## 4. Regression evidence

- `apps/api`: build PASS, `tsc --noEmit` PASS, ESLint PASS (`--max-warnings 0`), jest **122/122** PASS (15 suites).
- `apps/web`: `next build` PASS (49 static pages), ESLint PASS (`--max-warnings 0`).
- Migration baseline SQL generated from the canonical schema via `prisma migrate
  diff --from-empty --to-schema-datamodel`.
- All Phase 20 edits verified: `tsc --noEmit` clean after each change; full API
  build + test suite + web build green after the final batch.

## 5. Bug-free-by-evidence areas (spot-audited)

- Cart ownership scope (per-user rows) — `apps/api/src/cart`.
- Order status transitions guarded by centralized state machine — `order-status.service.ts`.
- Admin/seller endpoints behind `RolesGuard` + ownership checks.
- Cookie security flags (httpOnly, Secure in prod, SameSite) — `auth.controller.ts`, `sellers.controller.ts`.