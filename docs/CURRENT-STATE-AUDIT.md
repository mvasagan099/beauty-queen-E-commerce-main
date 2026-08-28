# Current State Audit — Beauty Queen E-commerce

Audit executed against the live source tree on **2026-08-28 (Phase 17)**.
No feature is marked complete by assumption — every claim below was verified by
reading source, running builds, lint, type-checks, or tests.

---

## 1. Repository shape

- **Target stack (canonical):** `apps/web` (Next.js 15 App Router, React 19) +
  `apps/api` (NestJS 10, TypeScript, global prefix `/api`, port 5000) +
  Prisma/MySQL + Redis + BullMQ + Razorpay + Brevo.
- **Middle migration (non-canonical, kept for reference):** `backend/`
  (Express-TS) and `frontend/` (Next 14).
- **Legacy monolith (non-canonical, content source):** `app.js`,
  `server/router.js`, `views/*.hbs`, `public/`.
- **Shared:** `prisma/schema.prisma` (20 core tables + advanced tables),
  `packages/types`, `packages/validation`, `packages/config`, `docker/`,
  `scripts/`, `.github/workflows/`, `docs/`.
- Root `package.json` is **not** an npm workspace; each app has its own
  `node_modules` and lockfile.

## 2. Verification results

| Check | Command | Result |
|-------|---------|--------|
| Prisma generate | `npx prisma generate` | PASS (writes to `apps/api/node_modules/.prisma/client`) |
| API build | `cd apps/api && npm run build` | PASS |
| API type-check | `cd apps/api && npx tsc --noEmit` | PASS |
| API lint | `cd apps/api && npm run lint` | PASS (0 warnings) |
| API unit tests | `cd apps/api && npm test` | PASS — 15 suites / 122 tests |
| Web build | `cd apps/web && npm run build` | PASS (49 static pages + middleware) |
| Web lint | `cd apps/web && npm run lint` | PASS (0 warnings) |
| Baseline migration SQL | `prisma migrate diff --from-empty --to-schema-datamodel` | Generated (515 lines) |
| Full-stack runtime | Docker/MySQL/Redis | ⛔ not runnable in this environment |

Note: `next build` intermittently fails at the final "collecting build traces"
(standalone) stage with transient `ENOENT`/`BUILD_ID` errors — a Next.js 15.5
Windows/filesystem race, not a code issue (compilation, lint, types and static
generation always pass; retry succeeds, and a full successful run was captured).

## 3. Issues found and fixed this audit

| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| 1 | P0 | No initial Prisma migration — fresh `prisma migrate deploy` produced a broken DB (chain created only auxiliary tables) | Replaced with single baseline `prisma/migrations/20260828000000_init` (+`migration_lock.toml`) |
| 2 | P0 | `prisma generate` output resolved to root `node_modules`; `apps/api` used a fallback shim missing `Role`/`OrderStatus` | Generator `output = "../apps/api/node_modules/.prisma/client"` |
| 3 | P0 | API build broken: missing `CreateOrderDto` import | Restored import in `orders.service.ts`; build + tests green |
| 4 | P1 | `/seller` (root) 404 for logged-in sellers | Added `apps/web/app/seller/page.tsx` → redirect `/seller/dashboard` |
| 5 | P1 | No seller profile page (sidebar had no Profile link) | Added `apps/web/app/seller/profile/page.tsx` + sidebar item |
| 6 | P1 | `admin/audit-logs` used hard-coded `http://localhost:5000` fetch | Centralized through `adminApi.auditLogs` in `apps/web/lib/api.ts` |
| 7 | P1 | Dead files (no imports): `product-detail-client.tsx`, `server-product.service.ts` | Deleted |
| 8 | P2 | `packages/types#OrderStatus` and `packages/validation#updateOrderStatusSchema` missing `Confirmed` | Synced to Prisma enum (all 7 values) |

## 4. Audit claims reviewed and corrected

- **"`server/.env` and `backend/.env` are staged in git"** — FALSE. `git ls-files`
  shows only `.env.example` is tracked. Nothing to unstage.
- **"Weak JWT secrets in `.env.example`"** — FALSE. Secrets are blank with a
  32-char requirement; `env.validation.ts` enforces `min(32)` and the auth
  module/strategy throw when missing. No weak fallback strings remain in `src/`.
- **"`db:seed` references a nonexistent `prisma/seed.ts`"** — FALSE. Root script
  is `cd apps/api && node prisma/seed.js`; the file exists at
  `apps/api/prisma/seed.js` and `apps/api` `prisma:seed` is consistent.
- **"Broken `/admin/orders/dashboard` link"** — FALSE in current source.
  `apps/web/app/admin/orders/page.tsx` links to `/admin/dashboard` (exists).
  Admin sidebar items all resolve to existing routes.
- The `useAdminOrderDashboard` hook targets `adminOrdersApi.dashboard()` →
  `GET /orders/dashboard`; it is currently unused (kept as a ready helper).

## 5. Auth/data-flow facts (verified)

- Customer login: OTP via Redis, then JWT set in httpOnly cookies
  (`access_token` 15 m, `refresh_token` 7 d), cookie domain = host, so the
  browser sends them to `localhost:3000` too → Next middleware guard works.
- Seller login: sets the same httpOnly cookies **and** returns tokens in the
  body; the frontend stores the seller Bearer token in `localStorage`. The
  middleware cookie guard therefore works for sellers as well.
- Backend enforces roles (`CUSTOMER/SELLER/ADMIN`) and ownership (IDOR) checks
  on every guarded endpoint; the middleware is only a routing guard.
- Cookies: `httpOnly`, `secure` in production, `sameSite=lax`, CSRF
  double-submit guard available in the common module.

## 6. Environment limitations (honest reporting)

- **No Docker, MySQL, or Redis** installed → the API/worker/web were not run
  against real infra; a fresh-DB migration apply and end-to-end flows were not
  exercised. The generated baseline SQL is the guarantee for fresh deploys.
- Razorpay / Brevo production credentials are placeholders; real provider flows
  require secrets + a live network.
- E2E (Playwright/supertest-instance) suites are not yet implemented.

## 7. Risk register (top remaining)

| Risk | Level | Mitigation |
|------|-------|------------|
| Fresh-DB migration never executed against real MySQL | Medium | Baseline generated from schema; run `docker compose up mysql && npx prisma migrate deploy` on first real env |
| `next build` standalone-stage flakiness on Windows | Low | Retry; unrelated to code; CI on Linux unaffected |
| Images stored on local `uploads/` | Medium | Shared volume / object-store adapter documented (`docs/DEPLOYMENT.md`) |
| E2E/load/backup-restore unexercised | Medium | Documented runbooks + checklist; requires infra |

## 8. Conclusion

Code-level state: **ready**. Infrastructure-level state: **configured but not
yet exercised in a live environment**. The repository is in a consistent,
buildable, tested state; deployment to a real environment is the remaining
verification step (see `docs/PROJECT-COMPLETION-REPORT.md`).