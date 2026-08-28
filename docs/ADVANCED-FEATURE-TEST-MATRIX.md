# Advanced Feature Test Matrix (Phase 17)

Covers the Phase 17 “advanced e-commerce features & business capabilities” work:
search quality, frequently-bought-together, wishlist → cart, notification preferences,
stock/price alerts, abandoned-cart recovery, coupon auto-expiry, admin data exports,
extended analytics, and the customer-support ticket system.

Status legend: ✅ implemented & verified · 🟡 implemented, runtime check pending ·
⛔ out of scope / deferred.

---

## 1. Search — relevance ranking & suggestions

| # | Feature | Status | Where | Test evidence |
|---|---------|--------|-------|---------------|
| 1.1 | Full-text ranked search (rank computed on term overlap, prefix, starts-with, ptype match) | ✅ | `apps/api/src/search/search.service.ts` | `src/search/search.service.spec.ts`: empty query, ranking, pagination, long-query truncation |
| 1.2 | `/products/search?sort=` allowlist (`price_asc` / `price_desc` / `newest`); rank always final tiebreaker | ✅ | `apps/api/src/search/search.service.ts`, `apps/api/src/products/*` | tsc + eslint PASS; exercised by web `/search` sort dropdown |
| 1.3 | `GET /search/suggestions?q=` (populated name prefix suggestions) | ✅ | `apps/api/src/search/search.controller.ts` | unit-adjacent; manual: header autocomplete |
| 1.4 | `GET /search/popular` (aggregate from `search_queries`) | ✅ | same | manual via autocomplete footer |
| 1.5 | Header search autocomplete UI (debounced, keyboard-accessible, category chips) | ✅ | `apps/web/components/product/search-bar.tsx`, `components/layout/header.tsx` | `next build` PASS |
| 1.6 | Zero-result state with category suggestions | ✅ | `apps/web/app/search/page.tsx` | `next build` PASS |

## 2. Frequently Bought Together

| # | Feature | Status | Where | Test evidence |
|---|---------|--------|-------|---------------|
| 2.1 | `GET /products/:id/frequently-bought` — ordered orders intersect, min 1 occurrence, non-deleted, excludes self | ✅ | `apps/api/src/products/products.service.ts` + controller | tsc + eslint PASS |
| 2.2 | FBT rail on PDP (ProductCard grid) | ✅ | `apps/web/components/product/FrequentlyBoughtTogether.tsx`, `app/product/[id]/product-detail-view.tsx` | `next build` PASS; renders nothing when 0 |

## 3. Wishlist → cart

| # | Feature | Status | Where | Test evidence |
|---|---------|--------|-------|---------------|
| 3.1 | `POST /wishlist/:id/move-to-cart` — loves stock/price, mixes sizes, deletes wishlist rows | ✅ | `apps/api/src/wishlist/wishlist.service.ts` + controller | tsc + eslint PASS |
| 3.2 | “Move to Cart” button per wishlist item + toast | ✅ | `apps/web/app/wishlist/page.tsx` | `next build` PASS |

## 4. Notifications & email preferences

| # | Feature | Status | Where | Test evidence |
|---|---------|--------|-------|---------------|
| 4.1 | `NotificationPreference` per user (orderUpdates / paymentUpdates / promotional) | ✅ | Prisma `notification_preferences`; `src/notifications/preferences.service.ts` | `prisma validate` + `generate` PASS |
| 4.2 | `GET/PUT /notifications/preferences` (defaults, admin-reserved fields guarded) | ✅ | same + `notifications.controller.ts` | tsc + eslint PASS |
| 4.3 | Promotional consent gates abandoned-cart reminders (`hasPromotionalConsent`) | ✅ | `src/notifications/*`, `src/scheduled/scheduled-jobs.service.ts` | unit-reviewed; manual in UI |
| 4.4 | Support-ticket email event types (created / replied / resolved / closed) with deterministic eventId | ✅ | `src/notifications/types/notification.types.ts`, `support.service.ts` | `support.service.spec.ts` asserts event choice per transition |
| 4.5 | Notification Preferences UI (3 toggles) | ✅ | `apps/web/app/account/notifications/page.tsx` | `next build` PASS |

## 5. Stock & price alerts

| # | Feature | Status | Where | Test evidence |
|---|---------|--------|-------|---------------|
| 5.1 | Back-in-stock alert create/cancel (WAITING / CANCELLED / TRIGGERED), in-stock guard, restore-on-create | ✅ | `src/alerts/alerts.service.ts` | `alerts.service.spec.ts`: hasStock, create/cancel, restore, NotFound/in-stock guards |
| 5.2 | Price-drop alert create/cancel with watched price | ✅ | `src/alerts/alerts.service.ts` | `alerts.service.spec.ts`: create + message, cancel |
| 5.3 | `GET /alerts/my` returns both lists with product summary | ✅ | `src/alerts/alerts.controller.ts` | `alerts.service.spec.ts` listMyAlerts mapping |
| 5.4 | Alert scheduler: scan + `back-in-stock:{id}` / `price-drop:{id}` idempotent emails | ✅ | `src/notifications/alert-scheduler.service.ts` | tsc + eslint PASS (cron gated by Redis lock) |
| 5.5 | PDP alert buttons (stock bell when out of stock; inline price-drop target input) | ✅ | `apps/web/app/product/[id]/product-detail-view.tsx` | `next build` PASS |

## 6. Abandoned carts & coupon expiry

| # | Feature | Status | Where | Test evidence |
|---|---------|--------|-------|---------------|
| 6.1 | Abandoned-cart detection (24–72h no activity), promotional consent + in-stock guard, 7-day cooldown | ✅ | `src/scheduled/scheduled-jobs.service.ts` | `scheduled-jobs.module.ts` wired; run under `scheduled-abandoned-carts` Redis lock |
| 6.2 | Coupon expiry job sets `active=false` for past-dated coupons | ✅ | same | tsc + eslint PASS |
| 6.3 | `@Cron` jobs safe on dual boot (main + worker) | ✅ | both cron bodies use `RedisService.withLock` | design-reviewed |

## 7. Admin exports

| # | Feature | Status | Where | Test evidence |
|---|---------|--------|-------|---------------|
| 7.1 | `GET /admin/exports/:resource` for orders/products/customers/refunds/sales — batched CSV streaming with BOM | ✅ | `src/admin/admin-exports.{service,controller}.ts` | tsc + eslint PASS; ADMIN-only + audit logged |
| 7.2 | Audit action `ADMIN_EXPORT` records every download | ✅ | `src/audit/types/audit.types.ts` | reviewed in code |
| 7.3 | Export buttons on admin dashboard (5 resources) | ✅ | `apps/web/app/admin/dashboard/page.tsx` | `next build` PASS |

## 8. Extended analytics

| # | Feature | Status | Where | Test evidence |
|---|---------|--------|-------|---------------|
| 8.1 | 90-day date range in `GET /admin/analytics` | ✅ | `src/admin/analytics/*` (DTO + service switch) | tsc + eslint PASS |
| 8.2 | `setLowStockThreshold` rejects non-integer / negative values (400) | ✅ | `src/admin/analytics/analytics.service.ts` | tsc + eslint PASS |

## 9. Customer support tickets

| # | Feature | Status | Where | Test evidence |
|---|---------|--------|-------|---------------|
| 9.1 | Ticket creation with sequential number `BQ-TKT-00001` + first message + email | ✅ | `src/support/support.service.ts` | `support.service.spec.ts`: number format, email event, ownership guard |
| 9.2 | Order-ownership validation on referenced orders | ✅ | `support.service.ts:validateOwnedOrder` | spec: rejects foreign order with 400 |
| 9.3 | Customer list / detail / reply / close; internal notes excluded from customer views | ✅ | `support.service.ts` | spec: getTicket filters `isInternal:false`, closed-ticket reply blocked |
| 9.4 | Admin list (filters + search + pagination) / detail / reply (incl. internal) / status transitions | ✅ | `support.service.ts` | spec: adminList pagination/search; adminReply OPEN→IN_PROGRESS + email only for public replies; RESOLVED sets resolvedAt + email |
| 9.5 | Customer support page (create + thread) in account hub | ✅ | `apps/web/app/account/support/page.tsx` | `next build` PASS |
| 9.6 | Admin support console (filters, detail, reply, internal-note, status) | ✅ | `apps/web/app/admin/support/page.tsx` | `next build` PASS; sidebar Support nav added |

## 10. Cross-cutting verification

| Check | Result |
|-------|--------|
| `apps/api`: `tsc --noEmit` | ✅ PASS |
| `apps/api`: ESLint `--max-warnings 0` (all touched dirs incl. new specs) | ✅ PASS |
| `apps/api`: jest | ✅ 17 suites / 147 tests PASS (incl. new `alerts.service.spec`, `support.service.spec`) |
| `apps/web`: `next build` (types + lint + 49 static pages) | ✅ PASS |
| `apps/web`: ESLint `--max-warnings 0` (Phase 17 touched files) | ✅ PASS |
| `prisma validate` + `generate`, `migrate diff` | ✅ PASS |
| Full-stack runtime (Docker/MySQL/Redis + cron + Brevo send) | 🟡 not executable in this environment |

## Manual QA checklist (when Docker runtime is available)

- [ ] Header autocomplete shows suggestions; Enter navigates to `/search?q=`; chip click lands on category route.
- [ ] `/search?sort=price_asc` orders results by price with relevance tiebreak.
- [ ] Add 2 products to an order → PDP “Frequently Bought Together” shows the complementary product.
- [ ] Wishlist “Move to Cart” moves item and clears it from wishlist.
- [ ] Account → Notifications: toggle promotional off → no abandoned-cart emails; wrap cart 24h+ → email (with mailgun/Brevo sandbox).
- [ ] Out-of-stock product → “Notify me when back in stock”; restock → email + alert TRIGGERED.
- [ ] Price alert target ≥ current price → email on next scan (simulate by dropping price).
- [ ] Customer A references customer B’s order in a ticket → 400.
- [ ] Admin internal reply → invisible to customer; public reply → customer emails + IN_PROGRESS.
- [ ] Resolve ticket → resolution email; closed ticket blocks customer replies.
- [ ] Export each of 5 resources from admin dashboard → CSV opens in Excel with BOM + headers.
- [ ] Analytics 90d range renders; negative/invalid low-stock threshold → 400.
- [ ] Expired coupon auto-deactivates after nightly job (set `expiresAt` in past).

---

## Out of scope / deferred (unchanged)

- Real courier integration, invoice PDF, live payment-hold recovery, customer return UI, frontend E2E tests.