# Feature Inventory — Beauty Queen E-commerce

Authoritative feature inventory of the migrated platform, grouped by domain.
Status key: ✅ shipped · 🟡 partial / limited · ⛔ blocked by environment.

Source of truth for this inventory: `apps/api/src/**`, `apps/web/app/**`,
`prisma/schema.prisma`, verified by builds, lint and 122 passing API tests
(Phase 17 audit, 2026-08-28).

---

## 1. Storefront

| Feature | Status | Where |
|---------|--------|-------|
| Homepage w/ category sections (Saree, Kurthi, Top, Leggin, Cosmetics) | ✅ | `apps/web/app/page.tsx` |
| Category listing pages | ✅ | `apps/web/app/{saree,kurthi,top,leggin,cosmetics}` |
| Product detail (sizes, stock, gallery) | ✅ | `apps/web/app/product/[id]` |
| Retail search (query + filters + sorting + pagination) | ✅ | `apps/web/app/search`, `apps/api/src/search` |
| Related products / recently viewed | ✅ | `apps/web/components/product` |
| Wishlist | ✅ | `apps/web/app/wishlist`, `apps/api/src/wishlist` |
| Reviews + ratings (verified purchase, moderation) | ✅ | `apps/web/components/review`, `apps/api/src/reviews` |
| Contact page | ✅ | `apps/web/app/contact` |
| SEO (metadata, OG, sitemap, robots, JSON-LD) | ✅ | `apps/web/app/sitemap.ts`, `robots.ts` |
| Stock / price alerts (advanced) | ✅ | `apps/api/src/alerts` + `stock_alerts`/`price_alerts` tables |
| Product comparison | ⛔ never shipped (P3) | – |

## 2. Customer Account

| Feature | Status | Where |
|---------|--------|-------|
| OTP email login + JWT refresh rotation | ✅ | `apps/api/src/auth`, `apps/web/app/login`, `/verify` |
| Account dashboard / profile | ✅ | `apps/web/app/account` |
| Saved addresses (CRUD + default) | ✅ | `apps/web/app/account/addresses`, `apps/api/src/users` |
| Order history + detail + tracking + invoice | ✅ | `apps/web/app/account/orders`, `apps/web/app/orders/[id]` |
| Returns request | ✅ | `apps/web/app/account/returns`, `apps/api/src/returns` |
| Notifications (in-app) | ✅ | `apps/web/app/account/notifications`, `apps/api/src/notifications` |
| Notification preferences UI | 🟡 backend only (`notification_preferences`) | – |
| Formal guest checkout | 🟡 checkout accepts email/address without account; no dedicated guest session | `apps/api/src/checkout` |

## 3. Cart & Checkout

| Feature | Status | Where |
|---------|--------|-------|
| Server-side persisted cart | ✅ | `apps/web/app/cart`, `apps/api/src/cart` |
| Buy-now flow | ✅ | `apps/api/src/checkout` (buynow) |
| Cart checkout (address + payment) | ✅ | `apps/web/app/checkout` |
| Coupons (validate/apply/remove, usage limits, per-user limit) | ✅ | `apps/web/app/admin/coupons`, `apps/api/src/coupons` |
| Checkout saved-address selector | 🟡 deferred (Phase 12 P1) | `apps/web/components/checkout` |
| Prices server-authoritative (PricingService) | ✅ | `apps/api/src/pricing` |
| Shipping provider abstraction + free-shipping threshold | ✅ | `apps/api/src/shipping` |
| Tax configuration | ✅ | `apps/api/src/tax` |
| Shipping calc by pincode | ✅ | `apps/api/src/shipping` (`/shipping/calculate`) |
| Pincode serviceability | ⛔ never shipped (P3) | – |

## 4. Payments

| Feature | Status | Where |
|---------|--------|-------|
| Razorpay checkout (UPI) + COD | ✅ | `apps/api/src/payments`, `apps/web/components/payment` |
| Server-side HMAC signature verification | ✅ | `apps/api/src/payments` (razorpay.service) |
| Idempotent webhooks w/ provider cross-check | ✅ | `apps/api/src/payments` (webhook.service) |
| Payment status polling + retry | ✅ | `apps/web/app/payment`, `apps/web/components/payment/PaymentStatus.tsx` |
| Refunds (provider-confirmed) | ✅ | `apps/api/src/refunds` |
| Per-payment refund UI | 🟡 admin refund list; per-payment action partial | `apps/web/app/admin/refunds` |

## 5. Orders

| Feature | Status | Where |
|---------|--------|-------|
| Order creation + lifecycle state machine | ✅ | `apps/api/src/orders/order-status.service.ts` |
| Status history + events | ✅ | `order_status_history`, `order_events` tables |
| Cancel (customer), status update (seller/admin) | ✅ | `apps/api/src/orders`, `apps/api/src/sellers` |
| Invoices (snapshot-based) | ✅ | `apps/api/src/invoices` |
| Admin order management + dashboard | ✅ | `apps/web/app/admin/orders`, `/admin/dashboard` |
| Order grouping (multi-item single order) | ⛔ each line items = one `Order` row (P2) | – |

## 6. Seller

| Feature | Status | Where |
|---------|--------|-------|
| Seller signup / login (bcrypt) / logout | ✅ | `apps/api/src/sellers` |
| Seller dashboard + analytics | ✅ | `apps/web/app/seller/dashboard`, `hooks/use-analytics.ts` |
| Seller profile view + edit | ✅ | `apps/web/app/seller/profile` (NEW, Phase 17) |
| Product CRUD (ownership-scoped, soft delete + restore) | ✅ | `apps/web/app/seller/{products,add-product,edit-product/[id]}` |
| Inventory (sizes, low-stock flags) | ✅ | `apps/web/app/seller/inventory`, `apps/api/src/inventory` |
| Seller orders + status updates | ✅ | `apps/web/app/seller/orders`, `apps/api/src/sellers` |
| Seller `/` root route | ✅ | `apps/web/app/seller/page.tsx` (NEW, Phase 17) |

## 7. Admin

| Feature | Status | Where |
|---------|--------|-------|
| Admin dashboard + analytics | ✅ | `apps/web/app/admin/dashboard`, `/admin/analytics` |
| User/seller management (status, role) | ✅ | `apps/web/app/admin/{users,sellers}` |
| Product management | ✅ | `apps/web/app/admin/products` |
| Order management + detail | ✅ | `apps/web/app/admin/orders`, `/admin/orders/[id]` |
| Coupon management | ✅ | `apps/web/app/admin/coupons` |
| Returns + refunds management | ✅ | `apps/web/app/admin/{returns,refunds}` |
| Audit logs | ✅ | `apps/web/app/admin/audit-logs` (client centralized in Phase 17) |

## 8. Cross-cutting

| Feature | Status | Where |
|---------|--------|-------|
| AuthN/AuthZ (JWT, roles, ownership/IDOR guards, CSRF) | ✅ | `apps/api/src/auth`, `apps/api/src/common` |
| Rate limiting (Redis) | ✅ | `apps/api/src/common/rate-limit.guard.ts` |
| Audit logging | ✅ | `apps/api/src/audit` |
| Notifications + email (BullMQ → Brevo) | ✅ | `apps/api/src/notifications`, `apps/api/src/worker.ts` |
| Background jobs / queues | ✅ | BullMQ queues + worker |
| Health endpoints + graceful shutdown | ✅ | `apps/api/src/common/health.controller.ts` |
| Structured logging + request correlation | ✅ | `apps/api/src/common/logger.ts`, request-id middleware |
| Feature-rich admin/support (tickets, abandoned carts) | ✅ advanced tables | `support_tickets`, `support_messages`, `abandoned_cart_emails` |
| Frontend automated E2E tests | 🟡 not implemented (deferred P1) | – |
| Docker (web/api/worker/mysql/redis) | ✅ configured, ⛔ runtime not executable here | `docker/`, `docker-compose.yml` |

---

## Verification evidence (Phase 17)

| Check | Result |
|-------|--------|
| `apps/api`: `nest build` + `tsc --noEmit` | PASS |
| `apps/api`: ESLint `--max-warnings 0` | PASS |
| `apps/api`: jest | 17 suites / 147 tests — PASS |
| `apps/web`: `next build` (compilation + lint + types + 49 static pages) | PASS |
| `apps/web`: ESLint `--max-warnings 0` | PASS |
| `prisma migrate diff --from-empty` (baseline SQL) | Generated, matches schema |
| Full-stack runtime (Docker/MySQL/Redis) | ⛔ unavailable in this environment |