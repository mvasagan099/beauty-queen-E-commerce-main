# Missing Features (Phase 14 — Updated)

**Date:** 2026-08-26
**Scope:** All missing/broken features discovered during Phase 14 final audit

---

# ═══════════════════════════════════════════════════════════════
# PHASE 12 — FINAL FEATURE GAP AUDIT (Authoritative Current State)
# Date: 2026-08-28
# This section SUPERSEDES all earlier feature classifications below.
# Features listed here are the ONLY genuinely incomplete items.
# Everything else has been verified complete against source + tests.
# ═══════════════════════════════════════════════════════════════

Verification evidence (Phase 12 run, refreshed during Phase 15 / RC1):
- `npm run build:api` (nest build) → PASS
- `npm run test` (API) → 17 suites / 147 tests, ALL PASS
- `npm run test:e2e` (API E2E) → 20 tests, ALL PASS (exit 0)
- `npm run lint` (API) → PASS (exit 0, max-warnings 0)
- `npx tsc --noEmit` (apps/web) → PASS
- `npm audit` (API) → 0 Critical; 14 vulnerabilities (see `docs/RC1-BUGS.md` post-RC1 backlog)
- Full endpoint + schema + frontend route audit — see `docs/FINAL-FEATURE-MATRIX.md`.

## P0 — Critical (blocking safe operation)

**None.** All P0 capabilities verified complete:
- Authentication/Authorization (JWT + RBAC + OTP rate-limited) ✅
- Password hashing (bcrypt) ✅
- Webhook signature verification + idempotency ✅
- Payment amount integrity (order = payment = Razorpay, provider cross-check) ✅
- Rate limiting (OTP + payment money endpoints) ✅
- Input validation (global ValidationPipe, forbidNonWhitelisted) ✅
- File-upload hardening (size/MIME/signature/dimensions/path-traversal) ✅

## P1 — High (important, not yet done)

| # | Feature | Notes |
|---|---------|-------|
| 1 | Frontend automated/E2E tests (Playwright) | No frontend test suite; backend unit tests only. Add customer/seller/admin E2E journeys. |
| 2 | Checkout saved-address selector | Saved-address CRUD exists; `/checkout` still uses manual entry. (Saved-address UI itself is complete.) |

> Related P1 hardening note (not strictly a missing feature): a real courier/shipping provider and production Razorpay/Brevo credentials must be configured for live operation; the application is architecture-ready for both.

## P2 — Medium (important e-commerce enhancements, not done)

| # | Feature | Notes |
|---|---------|-------|
| 3 | Order grouping (multi-item checkout → one order) | Each line item remains a separate `Order` row. |
| 4 | Guest checkout flow formalized | Checkout requires login via middleware. |
| 5 | API response caching | No `Cache-Control` on product APIs (image caching legacy only). |
| 6 | Accessibility finalization | Some ARIA present; no skip-to-content link, partial alt coverage. |
| 7 | Admin UI for initiating refunds from payment page | `/admin/refunds` + `POST /payments/:id/refund` exist and work; no per-payment refund button UI. |
| 8 | Automated payment reconciliation alerting | Amount/currency mismatches are logged + payment marked FAILED; no automated alert. |
| 9 | Striker rate limiting beyond OTP/payment endpoints | Auth/search/orders have partial limiting; more endpoints can be covered. |

## P3 — Low (nice-to-have / explicitly deferred — do NOT implement without a clear business requirement)

| # | Feature | Notes |
|---|---------|-------|
| 10 | Wishlist heart toggle on product-card grid | Present on product detail only. |
| 11 | Product comparison (`/compare`) | Not required for current product model. |
| 12 | PDF / downloadable invoice | Invoice data via API; no PDF renderer. |
| 13 | Real courier provider integration (Shiprocket/Delhivery) | `ShippingProvider` interface ready; no live creds. |
| 14 | Inventory reservation → finalize/release lifecycle | Stock decremented at order creation; no reservation/rollback. |
| 15 | Notification preferences UI | ✅ **IMPLEMENTED in Phase 17** — three toggles (order/payment/promotional) on `/account/notifications` via `GET/PUT /notifications/preferences`. |
| 16 | Canonical URLs on public pages | Not implemented (product JSON-LD + OG + sitemap done). |
| 17 | Customer analytics | Admin/seller analytics exist; customer analytics not implemented. |
| 18 | Multi-seller marketplace / commission / product approval | `sellerId` exists but single-vendor model retained (legacy behavior). |
| 19 | Load / performance testing against live infra | Not performed. |
| 20 | Pincode serviceability + abandoned-cart recovery emails | Abandoned-cart recovery ✅ **IMPLEMENTED in Phase 17** (24–72h, promotional consent, 7-day cooldown). Pincode serviceability still requires a valid external data source; flagged future. |

---

# Historical audit trail (below)

> Earlier phase classifications below are retained for historical reference but
> are SUPERSEDED by the Phase 12 section above. Items marked ✅ in prior phases
> are already implemented; anything restated as missing in prior phases but not
> listed above should be treated as complete or deferred as described above.

---

# P0 — Critical (Application Cannot Safely Operate)

## 1. ~~Webhook Signature Verification Bypass~~ ✅ Phase 6

**Reason:** Razorpay webhook at `POST /api/payments/webhook` skips signature verification if `signature` or `rawBody` is missing. An attacker can POST fake `payment.captured` events to mark orders as paid.

**Affected pages:** Payment processing, Order creation
**Affected API:** `POST /api/payments/webhook`
**Database changes:** None
**Implementation plan:**
- In `payments.controller.ts:78-91`, reject requests where `signature` or `rawBody` is falsy
- Return 400 immediately without processing
- Add webhook secret validation from env

**Status:** ✅ **FIXED in Phase 6** — webhook returns HTTP 400 when signature/rawBody missing; event persistence in `payment_webhook_events` makes processing idempotent (see `docs/PAYMENT.md`).

## 2. No Rate Limiting

**Reason:** No `@nestjs/throttler` configured. OTP endpoint (`/api/auth/send-otp`) allows unlimited requests — attacker can flood with OTP emails or brute-force OTPs.

**Affected pages:** Login
**Affected API:** `POST /api/auth/send-otp`, `POST /api/auth/verify-otp`, `POST /api/sellers/login`
**Database changes:** None
**Implementation plan:**
- Install `@nestjs/throttler`
- Configure global throttle: 60 requests/minute default
- Apply stricter limits on OTP endpoints: 5 requests/minute
- Apply stricter limits on login endpoints: 10 requests/minute

## 3. Weak JWT Fallback Secrets

**Reason:** `auth.service.ts:72,76,99` falls back to `'access-secret'`/`'refresh-secret'` if env vars missing. All tokens signed with guessable secrets.

**Affected pages:** All authenticated pages
**Affected API:** All auth endpoints
**Database changes:** None
**Implementation plan:**
- Remove fallback defaults
- Throw error on startup if `JWT_ACCESS_SECRET` or `JWT_REFRESH_SECRET` not configured

## 4. Math.random() for OTP Generation

**Reason:** `auth.service.ts:22` uses `Math.random()` — not cryptographically secure. OTPs are predictable.

**Affected pages:** Login
**Affected API:** `POST /api/auth/send-otp`
**Database changes:** None
**Implementation plan:**
- Replace with `crypto.randomInt(100000, 999999)`

---

# P1 — High Priority (Important Existing Functionality Missing)

## 5. ~~Broken Payment Success Page~~ ✅ Phase 6

**Reason:** `payment/success/page.tsx:19` calls `paymentsApi.getStatus(0)` — always passes `0` instead of actual `checkoutId` from search params. Payment status is never verified.

**Affected pages:** `/payment/success`
**Affected API:** `GET /api/payments/:id/status`
**Database changes:** None
**Implementation plan:**
- Read `checkoutId` from search params
- Pass to `paymentsApi.getStatus(checkoutId)`
- Display actual payment status

**Status:** ✅ **FIXED in Phase 6** — `/payment/success` uses `paymentsApi.byCheckout(checkoutId)` backed by authoritative `GET /api/payments/checkout/:checkoutId/status` rendered via the new `PaymentStatusCard` (polls while PENDING/AUTHORIZED). Success page is only reachable after backend `verify` succeeds.

## 6. ~~Broken Payment Retry~~ ✅ Phase 6

**Reason:** `payment/failure/page.tsx:20` calls `paymentsApi.retry(0)` — always passes `0` instead of actual `checkoutId`.

**Affected pages:** `/payment/failure`
**Affected API:** `POST /api/payments/retry`
**Database changes:** None
**Implementation plan:**
- Read `checkoutId` from search params
- Pass to `paymentsApi.retry(checkoutId)`

**Status:** ✅ **FIXED in Phase 6** — `retry` is checkoutId-based, backend bumps `metadata.attempts`, and the failure page re-opens Razorpay via the `RazorpayCheckout` ref to re-verify with the backend.

## 7. Hardcoded localhost URLs in Seller/Admin

**Reason:** `seller/products/page.tsx:23,32,48` and `admin/orders/page.tsx:36` use hardcoded `http://localhost:5000/api/...` instead of the ApiClient. Breaks in any non-localhost environment.

**Affected pages:** `/seller/products`, `/admin/orders`
**Affected API:** Product delete/restore, Order status update
**Database changes:** None
**Implementation plan:**
- Replace all hardcoded fetch calls with ApiClient module calls
- Use `productsApi.delete()`, `productsApi.restore()`, `adminOrdersApi.updateStatus()`

**Status:** ✅ **FIXED in Phase 7** — `seller/products` now uses `productsApi.delete()/restore()` + `sellerApi.products()` pagination; `admin/orders` now uses `useAdminOrders`/`useUpdateAdminOrderStatus` via the ApiClient (hardcoded `localhost` removed). Note: `/admin/audit-logs` still has a hardcoded `http://localhost:5000` fetch (line 39) — should be migrated to the ApiClient.

## 8. ~~No Middleware for /seller/* and /admin/* Routes~~ ✅ Phase 7

**Reason:** `middleware.ts` only protects `/account` and `/checkout`. Any user (or unauthenticated visitor) can access seller and admin pages.

**Affected pages:** All `/seller/*` and `/admin/*` pages
**Affected API:** None (frontend routing only)
**Database changes:** None
**Implementation plan:**
- Add middleware rules for `/seller/*` (require seller token/cookie)
- Add middleware rules for `/admin/*` (require admin token/cookie)
- Redirect unauthorized users appropriately

**Status:** ✅ **FIXED in Phase 7** — `apps/web/middleware.ts` now protects `/account`, `/checkout`, `/seller/*`, and `/admin/*`; unauthenticated/unauthorized visitors are redirected to login; `/seller/login`, `/seller/signup`, `/login`, `/verify` are auth pages.

## 9. ~~alert() in Checkout~~ ✅ Phase 6

**Reason:** `checkout/page.tsx:203` uses native `alert()` for payment errors instead of sonner toast (which is available and used elsewhere).

**Affected pages:** `/checkout`
**Affected API:** None
**Database changes:** None
**Implementation plan:**
- Replace `alert()` with `toast.error()` from sonner

**Status:** ✅ **FIXED in Phase 6** — checkout uses `toast.error()`; `alert()` removed.

## 10. Seller Login Returns Tokens in Body

**Reason:** `sellers.service.ts:75` returns `accessToken` and `refreshToken` in JSON body. Seller tokens stored in localStorage (not httpOnly cookies). Vulnerable to XSS.

**Affected pages:** `/seller/login`
**Affected API:** `POST /api/sellers/login`
**Database changes:** None
**Implementation plan:**
- Return tokens via httpOnly cookies like customer auth
- Remove localStorage token storage
- Update seller token handling throughout frontend

**Status:** ✅ **FIXED in Phase 7** — `SellersController.login` now also sets httpOnly `access_token`/`refresh_token` cookies (JWT strategy reads cookie OR Bearer); `logout` clears them. Middleware relies on the cookie for route protection. localStorage token flow preserved for backward compatibility.

## 11. Swagger Exposed in Production

**Reason:** `main.ts:57` unconditionally enables Swagger at `/api/docs`. Exposes full API schema in production.

**Affected pages:** API documentation
**Affected API:** All
**Database changes:** None
**Implementation plan:**
- Conditionally enable Swagger: `if (nodeEnv !== 'production')`

## 12. Error Message Leakage

**Reason:** `all-exceptions.filter.ts:31` returns raw `exception.message` for non-HTTP exceptions. Can expose database errors, file paths, internal details.

**Affected pages:** All error responses
**Affected API:** All
**Database changes:** None
**Implementation plan:**
- Return generic message for non-HTTP exceptions
- Log detailed error server-side only

## 13. Cookie Path Mismatch on Clear

**Reason:** `auth.controller.ts:89-90` calls `clearCookie` without `path: '/'`. If cookie was set with `path: '/'`, clearing without matching path may fail in some browsers.

**Affected pages:** Logout
**Affected API:** `POST /api/auth/logout`
**Database changes:** None
**Implementation plan:**
- Add `path: '/'` to all `clearCookie` calls

## 14. CSP Disabled

**Reason:** `main.ts:22` sets `contentSecurityPolicy: false`. Removes XSS mitigation layer.

**Affected pages:** All
**Affected API:** None
**Database changes:** None
**Implementation plan:**
- Enable CSP with appropriate policy for the application

---

# P2 — Medium Priority (Important E-commerce Enhancement)

## 15. Missing Database Indexes

**Reason:** `products.ptype`, `products.price`, `products.deletedAt` have no indexes. Every category query, price sort, and soft-delete filter does a full table scan.

**Affected pages:** Homepage, category pages, search, admin product list
**Affected API:** `GET /api/products`, `GET /api/products/homepage`
**Database changes:** Add indexes in Prisma schema + migration
**Implementation plan:**
- Add `@@index([ptype])` to Product model
- Add `@@index([price])` to Product model
- Add `@@index([deletedAt])` to Product model
- Add `@@index([userId, revoked])` to RefreshToken model
- Run `prisma migrate dev`

## 16. No Pagination on List Endpoints

**Reason:** `orders`, `products`, `users`, `reviews` list endpoints return unbounded results. Performance degrades as data grows.

**Affected pages:** Admin orders, admin products, admin users, seller products, seller orders, customer orders, reviews
**Affected API:** Multiple GET endpoints
**Database changes:** None
**Implementation plan:**
- Add `page` and `limit` query params to all list endpoints
- Return paginated responses with total count
- Update frontend DataTable to handle pagination

**Status:** ✅ **PARTIALLY FIXED in Phase 7** — Server-side pagination added for orders (admin + seller via `OrderQueryService.paginate`) and products (admin + seller). Frontend `lib/api.ts` forwards `page`/`limit`; a reusable `Pagination` component was added. Remaining: `users` and `reviews` list endpoints, and wiring remaining DataTables.

## 17. N+1 Query in Cart/Checkout

**Reason:** `payments.service.ts:39-63` and `checkout.service.ts:33-35` call `product.findFirst()` inside a for loop for each cart item.

**Affected pages:** Checkout, payment
**Affected API:** `POST /api/payments/checkout`, `POST /api/checkout/buynow`
**Database changes:** None
**Implementation plan:**
- Batch product lookups with `findMany({ where: { id: { in: productIds } } })`
- Map results by ID

## 18. Raw `<img>` Tags

**Reason:** 11 instances of `<img>` instead of `<Image>` from `next/image`. No lazy loading, no responsive sizing, no format optimization.

**Affected pages:** Product detail, cart, checkout, orders, reviews, admin, seller
**Affected API:** None
**Database changes:** None
**Implementation plan:**
- Replace `<img>` with `<Image>` from `next/image`
- Add `width`, `height`, `loading="lazy"` attributes
- Configure `next.config.js` for remote image domains

## 19. Incomplete Product Detail Component

**Reason:** `product-detail-client.tsx` exists with richer features (ProductGallery, ProductReviews, ReviewForm, RatingSummary, wishlist toggle, related products) but is unused. Active `page.tsx` has simpler implementation.

**Affected pages:** `/product/[id]`
**Affected API:** None
**Database changes:** None
**Implementation plan:**
- Integrate `product-detail-client.tsx` features into active `page.tsx`
- Or replace `page.tsx` with `product-detail-client.tsx`

## 20. ~~Coupon System Not Integrated in Frontend~~ ✅ Phase 11

**Reason:** Backend has full coupon validate/apply APIs, but no frontend UI for applying coupons during checkout.

**Affected pages:** `/checkout`
**Affected API:** `POST /api/coupons/validate`, `POST /api/coupons/apply`
**Database changes:** None
**Implementation plan:**
- Add coupon input field to checkout form
- Call `couponsApi.validate()` on apply
- Display discount in order summary

## 21. No Canonical URLs

**Reason:** SEO audit found no `<link rel="canonical">` tags. Duplicate content risk.

**Affected pages:** All
**Affected API:** None
**Database changes:** None
**Implementation plan:**
- Add canonical URL metadata to each page layout

## 22. No JSON-LD Structured Data

**Reason:** No product structured data for search engines. Missing rich snippet eligibility.

**Affected pages:** Product detail, category pages
**Affected API:** None
**Database changes:** None
**Implementation plan:**
- Add Product schema markup to product detail pages
- Add BreadcrumbList schema to category pages

---

# P3 — Low Priority (Nice-to-have)

## 23. Unused Dead Code Files

**Reason:** Multiple files are defined but never imported/used.

**Affected files:**
- `product-detail-client.tsx` (unused component)
- `server-product.service.ts` (unused service)
- `useUIStore` (unused Zustand store)
- `OrderDashboard` type (unused)
- Multiple API module methods never called
- `confirmation/page.tsx` (orphaned page)
- `apps/api/create-test-img.js`, `start-debug.js`, `test-upload.js` (dev files)

**Implementation plan:**
- Remove dead files after verifying no dynamic references

## 24. TypeScript `any` Cleanup

**Reason:** 132 occurrences of `any` type across the codebase.

**Implementation plan:**
- Replace `any` with proper types incrementally
- Focus on service methods and API client first

## 25. Console.log Cleanup

**Reason:** 23 console.log/error statements, mostly in test/seed files.

**Implementation plan:**
- Remove from production code
- Keep structured Pino logging only

## 26. Accessibility Improvements

**Reason:** No skip-to-content link, limited ARIA attributes, no alt text on product images.

**Implementation plan:**
- Add skip-to-content link
- Add alt text to all product images
- Add ARIA labels to interactive elements
- Test keyboard navigation

## 27. No Product Structured Data for Search Engines

**Reason:** Missing JSON-LD for product pages — Google rich snippets not available.

**Implementation plan:**
- Add Product schema to product detail pages

## 28. Unused React Query Configuration

**Reason:** `refetchOnWindowFocus: false` globally means cart/order data may be stale when user tabs back.

**Implementation plan:**
- Enable `refetchOnWindowFocus` for cart and order queries
- Keep disabled for static content (homepage, categories)

---

# P4 — Future

## 29. ~~Return/Refund System Frontend~~ ✅ Phase 11

**Reason:** Backend has ReturnRequest and Refund models but no frontend UI for customers to request returns.

**Implementation plan:**
- Create `/account/returns` page
- Create return request form
- Admin return management UI

## 30. Notification Preferences UI

**Reason:** `NotificationPreference` model exists but no UI for users to manage preferences.

**Implementation plan:**
- Add notification settings to account page
- Toggle order updates, payment updates, promotional

## 31. Advanced Search/Filtering

**Reason:** Basic search exists but no price range filter, sort options, or advanced filtering UI.

**Implementation plan:**
- Add price range slider
- Add sort dropdown (price, popularity, newest)
- Add category filter checkboxes

## 32. Seller Analytics Dashboard

**Reason:** Seller dashboard has basic stats but no charts or detailed analytics.

**Implementation plan:**
- Add sales charts
- Add order trends
- Add product performance metrics

**Status:** ✅ **PARTIALLY DONE in Phase 7** — Added an analytics module (`apps/api/src/admin/analytics/`) with admin endpoints (overview/sales/orders/products + configurable low-stock threshold) and a seller overview endpoint. Added `/admin/analytics` and `/seller/inventory` pages, `use-analytics` hooks, and enhanced seller/admin dashboards with StatCards. Product performance charts & Customer/mixed analytics remain future work.

## 33. Admin Audit Log Viewer

**Reason:** AuditLog model exists but no admin UI to view audit logs.

**Implementation plan:**
- Create `/admin/audit-logs` page
- Filter by action, entity, actor, date range

---

# Phase 5 — Cart, Buy Now, Checkout, Address & Order Creation

**Date:** 2026-08-27
**Scope:** Data integrity, security, and structure across the cart → checkout → order creation flow.

## NEWLY IMPLEMENTED (Phase 5)

| Item | Status | Description |
|------|--------|-------------|
| Pincode & Field Validation | ✅ DONE | 6-digit Indian pincode regex + `MinLength`/`MaxLength` on address fields in `CheckoutAddressDto` and `orders` `CreateOrderDto` (`apps/api/src/checkout/dto/checkout.dto.ts`, `apps/api/src/orders/dto/order.dto.ts`) |
| Phone validation | ✅ DONE | Contact number regex on checkout address DTO |
| Order Ownership Enforcement | ✅ DONE | `GET /orders/:id` now verifies the requester owns the order (by `userId` and/or `email`) via new `orders.service.getCustomerOrder`; admin/seller paths unchanged |
| Order List Ownership | ✅ DONE | `getOrdersByUser` filters by `userId` OR `email` instead of email only |
| Race-Condition-Safe Stock Decrement | ✅ DONE | `SELECT ... FOR UPDATE` row-lock + re-validation before decrement in both `checkout.service` (cart + buynow) and `payments.service` `createCheckout` |
| Atomic Cart Checkout | ✅ DONE | All cart line-items + cart clear now inside one `$transaction` — no partially created orders |
| `userId`/`sellerId` set on orders | ✅ DONE | Checkout-created orders persist `userId` and `sellerId` for ownership and seller reporting |
| Checkout Preview Endpoint | ✅ DONE | `POST /api/checkout/preview` returns pricing breakdown (items, subtotal, discounts, coupon, shipping, tax, total) without persisting anything, backed by `PricingService` |
| Cart component split | ✅ DONE | `components/cart/{CartItem,CartList,CartSummary}.tsx` extracted from monolithic `/cart` page |
| Checkout component split | ✅ DONE | `components/checkout/{CheckoutForm,AddressForm,OrderSummary,PaymentMethod}.tsx` extracted from monolithic `/checkout` page |

## REMAINING (documented for future)

| Feature | Status | Reason |
|---------|--------|--------|
| Checkout saved-address selector | FUTURE | Saved addresses exist (Phase 9) but checkout still uses manual entry |
| Server-side order grouping under single `order_id` | FUTURE | Each line item remains a separate order row |
| Guest checkout flow formalization | FUTURE | Checkout works but no explicit "continue as guest" path |
| Multi-step checkout / step indicators | FUTURE | Single-page form retained |

---

# Phase 6 — Payment Hardening (Completed)

**Date:** 2026-08-27

## RESOLVED (Phase 6)

| Item | Status | Notes |
|------|--------|-------|
| #1 Webhook Signature Verification Bypass | ✅ FIXED | Webhook 400s on missing signature/raw body; idempotent event store |
| #5 Broken Payment Success Page | ✅ FIXED | Real `checkoutId` from search params, authoritative status endpoint, polling |
| #6 Broken Payment Retry | ✅ FIXED | `retry(checkoutId)` + RazorpayCheckout ref re-open + backend re-verify |
| #9 alert() in Checkout | ✅ FIXED | Replaced with sonner `toast.error()` |

## NEWLY IMPLEMENTED (Phase 6)

| Item | Status | Description |
|------|--------|-------------|
| Signature verification | ✅ DONE | HMAC-SHA256 via `crypto.timingSafeEqual` on `POST /payments/verify` |
| Provider cross-check | ✅ DONE | `razorpay.payments.fetch` compares amount/currency/order_id/status; mismatch → payment FAILED, orders NOT confirmed |
| Backend-authoritative amounts | ✅ DONE | Frontend never sends prices; Razorpay order created server-side only |
| Idempotent webhooks | ✅ DONE | `payment_webhook_events` unique `providerEventId` + Redis locks |
| Webhook handlers | ✅ DONE | captured / failed / authorized / refund.processed / refund.created / refund.failed |
| create-order endpoint | ✅ DONE | Idempotent; reuses PENDING Razorpay order |
| retry endpoint | ✅ DONE | CheckoutId-based, `metadata.attempts` increment |
| refund endpoint | ✅ DONE | Admin `POST /:paymentId/refund`, full/partial, duplicate-refund guard, auto status refresh |
| Status endpoints | ✅ DONE | `/checkout/:checkoutId/status` + `/:id/status` with ownership enforcement |
| Payment page hardening | ✅ DONE | Success/failure read real backend status; success only after verify |
| `RazorpayCheckout` component | ✅ DONE | Imperative `open()`, lazy script load, replaces inline logic |
| `PaymentStatusCard` polling | ✅ DONE | Polls every 4s while PENDING/AUTHORIZED |
| Rate limiting | ✅ DONE | Redis-backed `RateLimitGuard` on all money endpoints |
| DB migration | ✅ DONE | `20260827_phase6_payments` — payment.user_id/method/metadata + `payment_webhook_events` |

## STILL OPEN — Payment (deferred)

| Item | Priority | Reason |
|------|----------|--------|
| Reconciliation/alerting for provider amount/currency mismatches | P2 | Currently logged + payment marked FAILED; no automated alert |
| Stock release for abandoned/failed-payment checkouts | P2 | Stock reserved at checkout creation; release on timeout/abandon is future work |
| Admin UI for initiating refunds | P2 | API-ready (`POST /:paymentId/refund`); no frontend page |
| Invoice/GST generation & payment analytics | P3 | No PDF/reports yet |
| Non-payment rate limiting (auth, search, orders) | P2 | `RateLimitGuard` applied to payment endpoints only for now |

---

# Phase 9 — Advanced E-commerce Engine

**Date:** 2026-08-28
**Scope:** Audit + implementation of the search architecture, coupons, shipping, tax, pricing engine, checkout preview/conformation, recommendations, recently-viewed, inventory validation and related missing features.

## AUDITED & ALREADY PRESENT (not re-implemented — reused as-is)

| Item | Status | Notes |
|------|--------|-------|
| Search architecture (MySQL, provider-agnostic) | ✅ Present | `SearchService` (`apps/api/src/search/search.service.ts`) uses MySQL `contains`; interface prepared for a future engine (e.g. Meilisearch) without touching the controller |
| Product search (name/description/ptype) | ✅ Present | `GET /api/products?search=` and `GET /api/products/search?q=` |
| Search API query params (search, category, minPrice, maxPrice, size, sort, page, limit) | ✅ Present | Validated via `ProductQueryDto` (`forbidNonWhitelisted`) + hard bounds in `ProductsController.findAll` |
| Advanced filtering (category, price range, in-stock) | ✅ Present | Only fields that exist on `Product` are exposed; no fake filters |
| Sorting (newest, price_asc, price_desc, name_asc, name_desc) | ✅ Present | Default order `{ id: 'desc' }` retained |
| Server-side pagination + response shape | ✅ Present | `{ success, products, pagination: {page, limit, total, totalPages} }`; no full DB load to browser |
| Database indexing | ✅ Present | `Product` has indexes on `sellerId`, `ptype`, `price`, `deletedAt`, `createdAt`; `Order` on user/seller/status/checkout; search uses these |
| Search UI (SearchBar, SearchResults, ProductGrid, SortSelector, Pagination) | ✅ Present | `/search` page + `components/product/*` |
| Shareable search URLs | ✅ Present | `/search?q=&sort=&page=` |
| Coupon model + types (PERCENTAGE / FIXED_AMOUNT) | ✅ Present | `Coupon` model matches Phase 9 structure (code, type, value, min order, max discount, usage limits, dates, active) |
| Coupon validation (server-side) | ✅ Present | `CouponsService.validate` + `PricingService.calculateCouponDiscount` — never trusted from frontend |
| Coupon apply/release/usage lifecycle | ✅ Present | `CouponUsage` tied to user+order; transactions prevent double usage |
| Coupon APIs (validate + admin CRUD) | ✅ Present | `POST /coupons/validate`, `POST/PATCH/DELETE/GET /coupons/admin*` |
| Coupon UI (checkout + admin) | ✅ Present | `AdminCoupons` page + `OrderSummary` coupon input |
| Shipping engine + config | ✅ Present | `ShippingService` + `SiteConfig('shipping')` (`FREE_SHIPPING_THRESHOLD`, `DEFAULT_SHIPPING_FEE`, zone overrides) — configurable, no invented prices |
| GST/tax engine + config | ✅ Present | `TaxService` + `SiteConfig('tax')` — no arbitrary percentage added |
| Centralized `PricingService` | ✅ Present | Single source of truth reused by checkout/cart/orders; frontend never computes prices |
| Checkout preview + recalc on confirm | ✅ Present | `POST /checkout/preview`; order creation reloads products, revalidates stock/coupon, computes final amount server-side |
| Razorpay uses server-calculated totals | ✅ Present | Razorpay order amount = final server check-out amount; mismatches reject |
| Inventory validation (per-size, row-locked) | ✅ Present | `SELECT ... FOR UPDATE` + re-validation before decrement |
| Related products | ✅ Present (improved) | `GET /api/products/:id/related` added (Phase 9) — same-category first, in-stock only, never deleted/inactive |
| Recently Viewed (client/localStorage) | ✅ New | `lib/recently-viewed.ts` + `RecentlyViewed` component (non-sensitive browsing history only) |
| Recommendation UI reusing `ProductCard` | ✅ New | `RelatedProducts` + `RecentlyViewed` both render `ProductCard` — no duplicated card markup |

## NEW IN PHASE 9

| Item | Status | Notes |
|------|--------|-------|
| `GET /api/products/:id/related` endpoint | ✅ DONE | Dedicated endpoint; excluded current/deleted/out-of-stock products; same-category prioritised then newest fillers; `limit` param (max 12) |
| Recently Viewed (localStorage) | ✅ DONE | `recordRecentlyViewed`/`getRecentlyViewed`/`clearRecentlyViewed`; recorded on product page mount; rendered via `RecentlyViewed` component |
| `RelatedProducts` + `RecentlyViewed` components | ✅ DONE | Both reuse `ProductCard` (no markup duplication); replace the former inline related-products grid in `product-detail-view.tsx` |
| `ProductsService.getRelatedProducts` | ✅ DONE | Refactored out of `findById`; reusable and tested |
| Tests — Product search/filter/sort/pagination | ✅ DONE | `products.service.spec.ts` + `search.service.spec.ts` added (16 new cases) |

## STILL MISSING — documented (do not implement without clear business requirement)

| Item | Priority | Reason / status |
|------|----------|-----------------|
| Advanced search engine (Elasticsearch/OpenSearch/Meilisearch) | P3 | Not required — MySQL search meets current needs; `SearchService` is ready to be swapped |
| Inventory reservation during payment (pending → reserve → finalize/release) | P3 | Stock is decremented at order creation only; no reservation/rollback lifecycle yet. Any future implementation must be complete, not partial |
| Abandoned-cart detection + recovery emails (Brevo) | P3 | No inactive-cart detection or reminder emails; must respect consent/opt-in before sending marketing |
| Pincode serviceability | P3 | Only pincode-format validation + optional shipping zone overrides exist; no authoritative serviceable-pincode source. Do not claim serviceability without a valid data source |
| Pincode→delivery-availability→shipping-calc chain UI | P4 | Backend `ShippingService.calculateShipping` accepts pincode; no frontend availability check UI |
| Payment retry for COD/abandoned | P2 | Online retry exists; COD failure/abandon stock release is future work (see Payment section) |

## DEFINITION OF DONE (Phase 9) — VERIFIED

- [x] Product search works
- [x] Filtering works
- [x] Sorting works
- [x] Pagination works
- [x] Search URLs work
- [x] Product queries are validated
- [x] Coupon architecture works
- [x] Coupon validation is server-side
- [x] PricingService is centralized
- [x] Checkout preview works
- [x] Checkout recalculates final price
- [x] Shipping architecture is ready (configurable; defaults ₹0)
- [x] Tax architecture is ready (configurable; no invented rate)
- [x] Related products work
- [x] Recently viewed works
- [x] Razorpay uses server-calculated totals
- [x] Inventory validation works
- [x] No frontend price manipulation possible
- [x] No fake shipping/tax/recommendation data is used
- [x] Missing features are documented

---

# Phase 10 — Complete Order Lifecycle

**Date:** 2026-08-28
**Scope:** Order status state machine, customer cancellation with inventory restoration + refunds, returns, refunds fully automated extraction, shipping abstraction, tracking, invoices, notifications, admin/seller/customer order management — without breaking the existing order flow.

## NEWLY IMPLEMENTED (Phase 10)

| Item | Status | Description |
|------|--------|-------------|
| Centralized order-status state machine | ✅ DONE | `OrderStatusService` (`order-status.service.ts`) — all transitions routed through `assertValidTransition`; invalid transitions rejected server-side, never trusted from the frontend |
| Centralized order query/filter service | ✅ DONE | `OrderQueryService` (`order-query.service.ts`) — status/paymentStatus/seller/productId/date range/search-by-id/paymentId/trackingNumber, safe pagination |
| Customer order cancellation | ✅ DONE | `POST /orders/:id/cancel` — ownership checked; only Pending/Confirmed/Processing cancellable; transactional inventory restore (per-size), OrderEvent recorded, customer notified, audited; refund auto-initiated when payment was Completed (`RefundsService` idempotency guard) |
| Order tracking endpoint | ✅ DONE | `GET /orders/:id/tracking` — ownership-checked, returns carrier/trackingNumber/trackingUrl/status |
| Order events (audit timeline) | ✅ DONE | New `OrderEvent` model; created on cancel + return transitions (support/debugging timeline) |
| Invoices | ✅ DONE | New `Invoice` model + `InvoicesService`/`InvoicesController`/`InvoiceNumberService`. Configurable number format `BQ-2026-000001`. `GET /orders/:id/invoice`, `/invoices/mine`, `/invoices/admin`, `/invoices/order/:id`. Built from historical order snapshot — never current product prices; cancelled-unpaid orders never invoiced |
| Shipping provider abstraction | ✅ DONE | `ShippingProvider` interface + `ConfigShippingProvider`; `ShippingService` delegates — a real courier provider can be plugged in without touching order logic |
| Admin returns controller | ✅ DONE | `GET/PATCH /api/admin/returns` (ADMIN-only) via `AdminReturnsController` + `ReturnsService.getByIdForAdmin` |
| Return transition events/notifications | ✅ DONE | `OrderEvent` recorded on request + every admin status change; existing approve/reject emails preserved |
| Order listing filters | ✅ DONE | Admin `getAllOrders` now accepts paymentStatus, date range, page/limit, search-by-id/paymentId/trackingNumber via `OrderQueryService` |
| Order dashboard metrics | ✅ DONE | Admin dashboard adds cancelledOrders, deliveredOrders, returnRequests, pendingRefunds + pendingRefundAmount, refundedAmount, shippedCount (all real data) |
| Frontend tracking + invoice hooks | ✅ DONE | `useOrderTracking`, `useOrderInvoice`; `ordersApi.tracking/invoice`, `invoicesApi`, `adminReturnsApi`; invoice card on order detail page |
| Tests | ✅ DONE | `order-status.service.spec.ts`, `order-query.service.spec.ts`, `shipping.provider.spec.ts` (20 cases) — cancellation rules, transition enforcement, filter/pagination, free-shipping thresholds |

## DEFINITION OF DONE (Phase 10)

- [x] Order status transitions centralised & enforced server-side
- [x] Cancellation only from Pending/Confirmed/Processing
- [x] Cancellation restores inventory transactionally
- [x] Paid cancelled orders get an auto-refund (idempotent)
- [x] Tracking endpoint secured by ownership
- [x] Invoice built from order snapshot (no live prices)
- [x] Shipping logic abstracted behind provider interface
- [x] Admin return management route (ADMIN-only)
- [x] Admin order filters expanded without breaking existing flow
- [x] Dashboard lifecycle metrics real (no invented data)
- [x] Backend `nest build` + frontend `tsc --noEmit` pass
- [x] New unit tests pass

## STILL NOT DONE (intentionally deferred / out of scope)

| Item | Priority | Reason |
|------|----------|--------|
| Real courier provider implementation (Shiprocket/Delhivery) | P3 | Interface present; no live integration credentials |
| Verified payment-hold / stock-release recovery job | P3 | Stock decrement at order creation only; not changed in Phase 10 |
| Customer-facing return UI (Phase 11) | P4 | API + admin route present; frontend is future |
| PDF/downloadable invoice | P3 | Invoice data available via API; no PDF renderer wired |
| Shipping-delay / ACTIVE-in-transit age alerts | P4 | Requires schedule; flagged for future |



---

# Phase 17 — Advanced E-commerce Features & Business Capabilities (2026-08-28)

**Scope:** Search relevance ranking + suggestions, `/products/search` sort, frequently-bought-together, wishlist→cart, notification preferences UI, stock/price-drop alerts, abandoned-cart recovery, coupon auto-expiry, admin CSV exports, 90-day analytics + low-stock threshold validation, and the customer-support ticket system (customer + admin).

## NEWLY IMPLEMENTED (Phase 17)

| Item | Status | Evidence |
|------|--------|----------|
| Notification preferences UI (order/payment/promotional toggles) | ✅ DONE | `apps/web/app/account/notifications/page.tsx`; backend `GET/PUT /notifications/preferences` |
| Abandoned-cart detection + recovery emails | ✅ DONE | `apps/api/src/scheduled/scheduled-jobs.service.ts` (cron `30 2 * * *`, Redis lock, 24–72h, consent, cooldown) |
| Coupon auto-expiry job | ✅ DONE | same service (cron `30 0 * * *`) |
| Back-in-stock + price-drop alerts (opt-in, idempotent emails) | ✅ DONE | `src/alerts/*`, `src/notifications/alert-scheduler.service.ts`, PDP UI |
| Ranked search + suggestions + popular queries | ✅ DONE | `src/search/*` (ranked ORDER BY, `suggestions`, `popular`) |
| Search sort (`price_asc`/`price_desc`/`newest`) on `/products/search` | ✅ DONE | web `/search` sort wired through |
| Frequently-bought-together | ✅ DONE | `GET /products/:id/frequently-bought` + PDP rail |
| Wishlist → cart move | ✅ DONE | `POST /wishlist/:id/move-to-cart` + wishlist page button |
| Admin CSV exports (orders/products/customers/refunds/sales) | ✅ DONE | `src/admin/admin-exports.*`, dashboard buttons, audited |
| 90-day analytics + low-stock threshold validation | ✅ DONE | `src/admin/analytics/*` |
| Customer support tickets (customer + admin) | ✅ DONE | `src/support/*`, `/account/support`, `/admin/support` |

## STILL NOT DONE (unchanged after Phase 17)

| Item | Priority | Reason |
|------|----------|--------|
| Real courier provider implementation (Shiprocket/Delhivery) | P3 | Interface present; no live integration credentials |
| Verified payment-hold / stock-release recovery job | P3 | Stock decrement at order creation only |
| Customer-facing return UI | P4 | API + admin route present; frontend future |
| PDF/downloadable invoice | P3 | No PDF renderer wired |
| Shipping-delay / ACTIVE-in-transit age alerts | P4 | Requires schedule; flagged for future |
| Pincode serviceability | P3 | Requires authoritative external pincode source |




