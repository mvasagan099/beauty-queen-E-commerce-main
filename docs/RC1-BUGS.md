# RC1 Bug & Risk Register

**Date:** 2026-08-28
**Phase:** Phase 15 — Release Candidate 1 hardening
**Scope:** All defects found and verified during the RC1 validation pass, plus
accepted risks and the post-RC1 upgrade backlog with mitigations.

---

## 1. Fixed during RC1 (all verified by build/lint/unit/e2e)

| ID | Sev | Area | Issue | Fix | Evidence |
|----|-----|------|-------|-----|----------|
| RC1-01 | P0 | Alerts module | `AlertsController` was missing the `@Controller()` decorator → "An invalid controller has been detected" abort at module registration; the Phase 17 stock/price-alert endpoints were never reachable. | Added `@Controller()` in `apps/api/src/alerts/alerts.controller.ts`. | `nest build` + e2e pass; `/api/products/:id/stock-alert` routes present in endpoint matrix. |
| RC1-02 | P0 | Redis/BullMQ outage | With Redis down, `queue.add()` blocks on `waitUntilReady()` → `POST /api/auth/send-otp` (and every email/notification enqueue) hung the HTTP request indefinitely. | BullMQ connection: `enableOfflineQueue:false`, `maxRetriesPerRequest:null`, bounded `retryStrategy` (`Math.min(t*200, 5000)`); `NotificationsService.enqueueWithTimeout(..., 1500ms)` races the enqueue against a timer and logs instead of blocking; `RedisService.onModuleDestroy` uses `disconnect()` (never `quit()`). | `apps/api/src/common/bull.module.ts`, `notifications/notifications.service.ts`; verified by live boot probe with Redis down (OTP request returns ~1.6s, 200). |
| RC1-03 | P0 | RedisService failure path | Any Redis command throwing/queueing in offline mode could propagate errors into request handlers. | Every method (`get/set/del/incr/expire/incrWithTtl/setNx`) now try/catches to a `fallbackToMemory()` in-process store. | `apps/api/src/common/redis.service.ts`. |
| RC1-04 | P1 | Auth API contract | `POST /api/auth/send-otp` returned HTTP 201 (Nest default for POST) while docs and the e2e suite expect 200. | Added `@HttpCode(HttpStatus.OK)`. | `apps/api/src/auth/auth.controller.ts`; e2e passes at ~1543 ms under Redis-down. |
| RC1-05 | P1 | E2E reliability | `npx jest` e2e run hung after completion because BullMQ/ioredis reconnect handles keep the process alive. | `test:e2e` script now `jest --config ./test/jest-e2e.json --forceExit`; Auth `afterAll` given 10000 ms. | `apps/api/package.json`, `apps/api/test/app.e2e-spec.ts`; `npm run test:e2e` exits 0. |
| RC1-06 | P2 | Build (typing) | sharp `^0.35.0` changed its type exports → `import * as sharp` failed the API type-check. | `import sharp from 'sharp'`; sharp pinned `^0.35.0`. | `apps/api/src/common/image.service.ts`, `apps/api/package.json`. |
| RC1-07 | P2 | Tooling | Duplicate `@eslint/*`/`typescript-eslint` devDependencies in `apps/api/package.json` produced install warnings/conflicts. | Deduplicated. | `npm install` clean; lint exits 0. |

---

## 2. Known / accepted at RC1 (non-blocking, with mitigation)

| ID | Sev | Area | Finding | Mitigation / plan |
|----|-----|------|---------|-------------------|
| RC1-08 | P1 | DB provisioning | Live DB has **no `_prisma_migrations`** table and was built from a dumped schema, not `prisma migrate`. `prisma migrate status` shows only `20260828000000_init` (baseline) — **not applied**. | Production deploy must: (1) apply the drift script `scripts/db-drift-to-target.sql` (purely additive: 6 missing tables, 9 missing indexes, 1 column), then (2) adopt the baseline. Operator steps documented in `docs/RELEASE-CANDIDATE-RC1.md` §5. Database is drift-safe (0 DROPs). |
| RC1-09 | P1 | Legacy data | `scripts/reconcile.ts`: Orders #1–3 are `Completed` with **no `Payment` row** (`checkoutId` null, placeholder `payment_id='pay_Razorpay123'`); 0 users/payments/refunds/returns in DB. Deliberate legacy import; inventory link OK. | Do not mark settled status on these; reconcile job + audit trail exists. Decision on back-filling payment rows belongs to business owner pre-live-cutover. |
| RC1-10 | P3 | Supply chain (API) | `npm audit` (API): **14 vulnerabilities — 10 moderate, 4 high** (js-yaml, lodash, multer, uuid paths). All require breaking `@nestjs/*` 10.x → 12.x major upgrades. | **Documented post-RC1 upgrade backlog** — single planned breaking upgrade; until then Dependabot/renovate pinned + CI audit gate with these findings allowed only via this register. sharp fix removed its high-severity advisory. |
| RC1-11 | P3 | Supply chain (Web) | `npm audit` (Web): **2 — 1 high, 1 moderate** — next.js 15 bundled postcss. Fix requires next 16 major. | Next 16 upgrade scheduled post-RC1; pinned majors + CI audit gate. |
| RC1-12 | P2 | Environment limits | Docker not installed here; docker-compose images and Dockerfiles present but **not built** in this environment. Redis not running (used to verify degradation, not the healthy path). | Documented; production runbook covers `docker compose up -d --build`. |
| RC1-13 | P2 | Fresh-DB test | Clean-room `prisma migrate deploy` verification impossible — `bq_user` has grants only on `beauty_queen` (no `CREATE DATABASE`). | Operator remediation: provision a throwaway schema/Database with matching grants, run `npm run db:generate && prisma migrate deploy && db:seed`. |
| RC1-14 | P3 | Route-scan fidelity | The 167-route matrix is produced by a static decorator scan; auth columns are curated against `docs/API.md`/README public set, not runtime introspection. | Ownership scoping verified separately (P0 IDOR fixes in `docs/FINAL-BUG-REPORT.md`). Re-verify post-deploy with Swagger JSON (`/api/docs-json`). |

---

## 3. Post-RC1 upgrade backlog (framework majors — explicitly deferred)

| Package | Current | Target | Why | Blocking advisories addressed |
|---------|---------|--------|-----|-------------------------------|
| `@nestjs/*` (core, common, config, platform-express, swagger, schedule, throttler, jwt, passport, bullmq, throttler, etc.) | 10.x | 12.x | Requires coordinated major migration (module init, DI, Swagger API changes) | lodash, multer, js-yaml, uuid paths (10 moderate / 4 high) |
| `next` (web) | 15.x | 16.x | Bundled postcss advisory; breaking App Router/middleware changes | postcss (1 high / 1 moderate) |

Until these land: keep `package-lock.json` changes minimal, pin exact majors in CI, and reference this register in the audit gate exception list.

---

## 4. Regression guard

- `npm run build:api` → PASS
- `npm run lint` (`--max-warnings 0`) → PASS
- `npm run test` (API) → **17 suites / 147 tests PASS**
- `npm run test:e2e` → **20/20 PASS (exit 0)**
- `npm run audit` exceptions → only RC1-10 / RC1-11 above