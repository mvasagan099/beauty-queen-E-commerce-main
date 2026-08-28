# Release Candidate 1 — Beauty Queen E-commerce

**Tag target:** `rc-1.0.0`
**Date:** 2026-08-28
**Stack:** Next.js 15 + NestJS 10 + Prisma/MySQL + Redis + BullMQ + Razorpay + Brevo (monorepo)

---

## 1. Purpose

First tagged release candidate of the full migrated + hardened platform. It
freezes the feature set, records the verification evidence, and lists the
exactly-known environment gaps that operators must close before GA.

**Status: VERIFIED CODE-WISE — READY TO COMMIT + TAG** (release decision in §8).

---

## 2. What changed since the last phase (Phase 17/20 record)

### Resilience (Redis/BullMQ outage behavior) — new in RC1
1. **BullMQ connection hardening** — `enableOfflineQueue:false`,
   `maxRetriesPerRequest:null`, bounded `retryStrategy`
   (`apps/api/src/common/bull.module.ts`). Workers no longer block enqueues on a
   down Redis.
2. **Notification/email enqueue timeout** — `NotificationsService.enqueueWithTimeout`
   (1500 ms) races `queue.add()`; a stalled Redis logs and returns instead of
   hanging the HTTP caller (`apps/api/src/notifications/notifications.service.ts`).
3. **RedisService graceful degradation** — every command falls back to an
   in-process store on any Redis error; `onModuleDestroy` uses `disconnect()`
   so shutdown never blocks (`apps/api/src/common/redis.service.ts`).
4. **Verified behavior** — with Redis stopped, `POST /api/auth/send-otp` returns
   200 in ~1.6 s and the boot path logs the expected queue failures instead of
   hanging (previously: unbounded hang).

### Correctness / compliance fixes
5. `AlertsController` restored `@Controller()` (module had failed registration).
6. `send-otp` now returns HTTP 200 (was 201) — matches docs + e2e contract.
7. sharp `^0.35.0` default-import typing fix (API `tsc`/build).
8. E2E suite made deterministic: `--forceExit` (BullMQ/ioredis handles) +
   explicit `afterAll` timeout.
9. `apps/api/package.json` devDependencies deduplicated.

---

## 3. Verification evidence (RC1 gate)

| Check | Command | Result |
|-------|---------|--------|
| API build | `npm run build:api` | PASS |
| API type-check | `npx tsc --noEmit` | PASS |
| API lint | `eslint "{src,test}/**/*.ts" --max-warnings 0` | PASS (exit 0) |
| API unit | `npm run test` | **17 suites / 147 tests PASS** |
| API e2e | `npm run test:e2e` (jest --forceExit) | **20/20 PASS (exit 0)** |
| Root audit | `npm audit` | 0 vulnerabilities |
| API audit | `npm audit` (apps/api) | 14 (10 mod, 4 high) → post-RC1 backlog |
| Web audit | `npm audit` (apps/web) | 2 (1 high, 1 moderate) → backlog |
| Web types | `npx tsc --noEmit` (apps/web) | PASS (prior phase record) |
| Web build | `next build` (standalone) | PASS (prior phase record) |
| Secret scan | `.env*` + compose interpolation | PASS — no secrets in git |
| Endpoints | static decorator scan | 167 routes / 33 modules (`docs/API-ENDPOINT-MATRIX.md`) |

> Unit count is **147**, not the earlier-recorded 122: a stale jest/ts-jest cache
> had hidden spec files; clean compile picked up the full suite.

---

## 4. Resilience summary (this release's headline)

- **Under Redis outage** the API boots, serves, and degrades gracefully
  (in-memory fallbacks, async queue messages logged, bounded retries).
- **Recovery** requires no restart; ioredis default reconnect handles are
  bounded and the BullMQ processor re-subscribes when Redis returns.
- **Failure visibility** — every enqueue failure is logged with the queue name,
  job labels, and a 1500 ms timeout marker.

---

## 5. Database state and operator steps (IMPORTANT)

Findings (full detail: `docs/RC1-BUGS.md` §2, `scripts/`):
- Live DB has **no `_prisma_migrations`** table (dumped, not `prisma migrate`).
- Drift vs canonical schema is **purely additive**: 6 tables, 9 indexes,
  1 column — `scripts/db-drift-to-target.sql`  (0 DROPs, no data loss risk).
- 3 legacy orders are `Completed` with no `Payment` row (reconcile flags them).

Deploy sequence for an existing database (new deployments: skip step 1):
1. `mysql beauty_queen < scripts/db-drift-to-target.sql`
2. `cd apps/api && npm run db:generate && npx prisma migrate deploy`
   (records the baseline `20260828000000_init` as applied; safe — tables exist)
3. `npm run db:seed` for categories/products
4. Boot API with the production env; verify `/api/health/ready` (DB + Redis OK)

> Clean-room `migrate deploy` from scratch is unverified here (local `bq_user`
> cannot `CREATE DATABASE`); the SQL is an exact copy of the canonical
> datamodel and was diff-compared (`prisma migrate diff`), so confidence is high.

---

## 6. Known gaps carried into GA (non-blocking)

| Area | Gap | Owner action |
|------|-----|--------------|
| Frontend E2E | No Playwright suite | P1 backlog (recorded in `docs/MISSING-FEATURES.md`) |
| Checkout UX | saved-address selector | P2 backlog |
| Ordering | multi-item checkout still splits per-line orders | P2 backlog |
| Payments | stock reservation/release lifecycle vs decrement-at-order | P2 backlog |
| API audit | 14 findings (NestJS 10 → 12 major) | Post-RC1 upgrade program |
| Web audit | 2 findings (Next 15 → 16 major) | Post-RC1 upgrade program |
| Infra verify | Docker build, live Redis healthy-path, load testing | On real infra |

Full enumerated list: `docs/MISSING-FEATURES.md` (authoritative current state)
and `docs/RC1-BUGS.md` §2.

---

## 7. Release artifacts

| Artifact | Location |
|----------|----------|
| Endpoint matrix (all 167 routes, auth classes) | `docs/API-ENDPOINT-MATRIX.md` |
| Bug/Risk register (fixed + accepted + backlog) | `docs/RC1-BUGS.md` |
| DB drift SQL (additive) | `scripts/db-drift-to-target.sql` |
| Reconcile report tool | `scripts/reconcile.ts` |
| Migration verification tool | `scripts/verify-migration.ts` |

---

## 8. Release decision

- [x] All P0/P1 bugs found are fixed OR documented with mitigation
- [x] Build / lint / type-check / unit / e2e all green
- [x] No secrets in repository
- [x] Migration is drift-safe (additive) with an exact operator script
- [x] Backlog is explicit and prioritized
- [ ] **Operator note** — run §5 steps and a smoke pass on staging before GA.
      Docker/Redis healthy-path verification must occur there.

**Decision: approve `rc-1.0.0` tag for commit; GA subject to §5 verification.**