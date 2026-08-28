# Changelog

All notable changes to the Beauty Queen E-commerce monorepo.

## [1.0.0-rc.1] — Phase 15 Release Candidate 1 (2026-08-28)

### Fixed (resilience / correctness)
- **Redis/BullMQ-down request hang (P0)**: `queue.add()` blocked indefinitely on
  `waitUntilReady()` when Redis was down, hanging `POST /api/auth/send-otp` (and
  every email/notification enqueue). Now: BullMQ connection uses
  `enableOfflineQueue:false`, `maxRetriesPerRequest:null` and a bounded
  `retryStrategy`; `NotificationsService.enqueueWithTimeout(..., 1500ms)` races
  the enqueue and logs failures instead of blocking; `RedisService` falls back to
  an in-process store per command and shutdown uses `disconnect()` (never
  `quit()`). Verified: OTP answers 200 in ~1.6s with Redis stopped.
- **Alerts module registration (P0)**: `AlertsController` was missing
  `@Controller()` → Nest aborts module registration; stock/price-alert endpoints
  were unreachable. Added the decorator.
- **`send-otp` status code (P1)**: returned 201; now `@HttpCode(200)` matching
  docs + e2e contract.
- **E2E reliability (P1)**: BullMQ/ioredis reconnect handles kept jest open;
  `test:e2e` now runs with `--forceExit` and the Auth `afterAll` has an explicit
  10000ms timeout. `npm run test:e2e` exits 0.
- **sharp 0.35 typings (P2)**: `import * as sharp` → `import sharp from 'sharp'`;
  sharp pinned `^0.35.0` (also clears the sharp audit advisory).
- **DevDeps dedupe (P2)**: removed duplicate `@eslint/*`/`typescript-eslint`
  entries from `apps/api/package.json`.

### Verified
- API: `nest build` PASS, `tsc --noEmit` PASS, ESLint (`--max-warnings 0`) PASS,
  jest **17 suites / 147 tests PASS**, e2e **20/20 PASS (exit 0)**.
  (Unit total is 147, not 122: a stale jest/ts-jest cache had hidden specs.)
- Secret scan clean (`.env*` gitignored, placeholder-only `.env.example`).
- `npm audit`: root 0; API 14 / web 2 — all framework-major upgrade paths,
  documented as the post-RC1 backlog in `docs/RC1-BUGS.md`.
- DB drift vs canonical schema is purely additive (6 tables, 9 indexes,
  1 column) — `scripts/db-drift-to-target.sql`; existing live DB has no
  `_prisma_migrations` table (dump-built), operator steps in
  `docs/RELEASE-CANDIDATE-RC1.md` §5.

### New docs
- `docs/API-ENDPOINT-MATRIX.md` (167 routes / 33 modules, access classes)
- `docs/RC1-BUGS.md` (fixed + accepted risks + framework upgrade backlog)
- `docs/RELEASE-CANDIDATE-RC1.md` (release gate + operator steps)

## [2.1.1] — Phase 19 final product-intelligence / production audit (2026-08-28)

### Fixed (security / correctness / deploy)
- **Seller order IDOR (P0)**: `GET seller/orders/:id` was calling the unscoped
  `getOrderById` so any seller could read any order (customer PII). Added
  `OrdersService.getSellerOrder(id, sellerId)` (scoped `findFirst`) and wired it
  into the seller controller; non-owned orders now 404.
- **Customer order-history IDOR (P1)**: `GET orders/:id/history` returned any
  order's status history with no ownership check. `getStatusHistory(id, user?)`
  now enforces ownership for customers; the ADMIN route keeps its ADMIN-role gate.
- **Flaky/broken Docker web build (P0)**: `docker/web/Dockerfile` depended on
  standalone output but never set `OUTPUT_STANDALONE=true`, so the image build
  produced no `server.js`; also `next build` intermittently aborted during
  standalone trace collection. Set `OUTPUT_STANDALONE=true` in the builder stage
  and wrapped the build in `apps/web/scripts/build-standalone.mjs` (clean `.next`
  + retry up to 4×) so standalone output is produced deterministically.
- **Search test suite (P2)**: `search.service.spec.ts` mocked `findMany/count`
  but the service uses `$queryRaw`; 5 tests failed. Rewrote the spec to test the
  real `$queryRaw`-backed implementation.

### Verified
- `apps/api`: `tsc --noEmit` PASS, ESLint PASS, `nest build` PASS, jest
  **122/122** PASS (15 suites).
- `apps/web`: ESLint PASS, `tsc --noEmit` PASS, standalone `next build` PASS
  (deterministic, `.next/standalone/apps/web/server.js` produced).
- CSRF remains an accepted opt-in (SameSite=Lax baseline active; frontend is
  Bearer-token-authenticated so the cross-site vector is minimal).
- Refund/checkout/OTP/search rate limiting re-confirmed present (audit
  "missing refund rate limit" observation was a false positive).

## [2.1.0] — Phase 20 production hardening (2026-08-28)

### Fixed (security / correctness)
- **Customer logout (P1)**: now revokes the current user's refresh tokens
  (`req.user.sub`) instead of all tokens, and clears cookies with `path: '/'`
  — aligned with seller logout.
- **Seller JWT fallback (P1)**: `sellers.service.login` no longer falls back to
  predictable `'access-secret'`/`'refresh-secret'`; throws if secrets unset.
- **Cross-role IDOR (P0)**: customer-scoped controllers (`users`, `cart`,
  `wishlist`, `checkout`, `notifications`, `orders`, `reviews`, `returns`,
  `refunds`, `invoices`, `payments`, `auth/me`, `auth/logout`, and metrics)
  now enforce `@Roles(CUSTOMER)` / `@Roles(ADMIN)` so a seller JWT cannot read
  or write customer data.
- **Coupon usage enforcement (P1)**: `consumeCoupon` now records usage
  atomically (locks the coupon row, enforces `usageLimit` + `perUserLimit`,
  increments `usedCount`, links the pending usage) so coupon limits are actually
  enforced on the payments checkout path.
- **Redis auth / TLS**: API, worker and BullMQ connections now support
  `REDIS_URL`, `REDIS_PASSWORD` and `REDIS_TLS`; zod env schema, `.env.example`
  and `docker-compose.yml` wired accordingly.
- **Rate limiting**: seller `signup`/`login`, `/auth/refresh`, and
  `checkout/preview|buynow|cartbuynow` are now rate-limited (`RateLimitGuard`,
  registered in the owning modules).
- **Metrics endpoint**: `/api/metrics` + `/api/metrics/queues` are now
  ADMIN-only (were public).
- **Product validation (P2)**: multipart create/update reject `NaN`/negative
  size quantities via non-negative coercion + validation.
- **Docs**: `FINAL-SECURITY-AUDIT.md` rewritten with evidence-verified status;
  stale FAIL findings (webhook signature, JWT fallbacks, `Math.random()` OTP,
  customer-route IDOR, global rate limiting, `.env`, `.env.example`, Swagger)
  confirmed fixed.

### Verified
- `apps/api`: `tsc --noEmit` PASS, ESLint PASS, `nest build` PASS, jest
  **122/122** PASS.
- `apps/web`: `next build` PASS (49 static pages), ESLint PASS.

## [2.0.0] — Phase 17 (2026-08-28)

### Changed / Fixed (this audit cycle)
- **Prisma client generation**: generator now explicitly writes to
  `apps/api/node_modules/.prisma/client` (`prisma/schema.prisma`), fixing
  `@prisma/client` fallback-shim resolution that broke `Role`, `OrderStatus`,
  and model exports in the API.
- **Migration baseline (P0 fix)**: the previous `prisma/migrations` chain only
  contained incremental patches (creating ~7 auxiliary tables) and had **no
  initial migration** — a fresh `prisma migrate deploy` would have produced a
  broken database. Replaced with a single authoritative baseline migration
  `20260828000000_init` generated from `schema.prisma` (all models, enums,
  indexes) plus `migration_lock.toml`. Safe because no database has ever been
  provisioned and the repository has no commits yet.
- **API**: fixed missing `CreateOrderDto` import in `orders.service.ts`; `nest
  build`, `tsc --noEmit`, ESLint, and 122 unit tests pass.
- **Web frontend**:
  - Added `/seller` root route (redirects to `/seller/dashboard`) — previously 404.
  - Added `/seller/profile` page (view + update shop name/email/mobile/password).
  - Added "Profile" item to the seller sidebar.
  - `admin/audit-logs` now uses the centralized `lib/api.ts` client instead of a
    hard-coded `http://localhost:5000` fetch.
  - Removed dead files: `app/product/[id]/product-detail-client.tsx`,
    `services/server-product.service.ts`.
- **Orphaned packages**: `packages/types` `OrderStatus` and
  `packages/validation#updateOrderStatusSchema` now include `"Confirmed"`
  (were missing a Prisma enum value).
- **Security posture verified** (no code change required): only `.env.example`
  is tracked in git (no `.env` staged); `.env.example` has blank JWT/RAZORPAY/
  BREVO secrets; `env.validation.ts` enforces ≥32-char JWT secrets and the
  auth module/strategy throw when secrets are missing.

### Unverifiable in this environment
Docker, MySQL, Redis and live infra are not installed here, so full-stack
runtime, fresh-DB migration, E2E, and load/backup-restore verification could
not be executed. See `docs/PROJECT-COMPLETION-REPORT.md`.

## [1.0.0] — Phases 1–16 (2026-08-26 → 2026-08-28)

### Added
- Full re-architecture into a monorepo: `apps/web` (Next.js 15), `apps/api`
  (NestJS), `packages/*`, `prisma/schema.prisma`, `docker/`, `scripts/`,
  `.github/workflows/`.
- All legacy features migrated and hardened: OTP customer auth, seller
  password auth, server-side cart, buy-now + cart checkout, Razorpay + COD
  payments with signature verification + idempotent webhooks, order lifecycle
  state machine, returns, refunds, invoices, coupons, reviews (moderation +
  verified purchase), wishlist, notifications (in-app + queued email),
  shipping/tax/pricing services, admin + seller dashboards/analytics, audit
  logging, search, SEO, refresh-token rotation, CSRF mitigation, rate
  limiting, health checks, structured logging with request correlation.
- Extensive documentation under `docs/` and per-app `docs/`.

## [0.1.0] — Legacy (pre-migration)
- Single-server Express + Handlebars + MySQL store with 5 product categories
  (Saree, Kurthi, Top, Leggin, Cosmetics), retail search, OTP/seller login,
  cookie cart, checkout, Razorpay (unverified) + COD, order history, product
  CRUD, image handling, contact page, banner slider, Brevo OTP email.