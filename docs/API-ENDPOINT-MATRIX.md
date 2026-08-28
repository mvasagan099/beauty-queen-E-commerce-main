# API Endpoint Matrix (RC1)

**Date:** 2026-08-28
**Scope:** Every controller route in `apps/api/src` as of Release Candidate 1.
**Source:** Static decorator scan of all `*.controller.ts` files across the API.
**Total:** 167 routes across 33 modules.
Path params rendered as `{name}`.

> **Auth semantics.** `Public` = no JWT required (matches `docs/API.md` + README public set).
> `CUSTOMER` / `SELLER` / `ADMIN` = JWT + `@Roles()` guard as enforced by the controller.
> Product write endpoints accept SELLER (ADMIN also allowed); `PUT /orders/:id/status`,
> coupon admin CRUD, exports, audit-logs, analytics, metrics and config routes are ADMIN-only.
> The complete role/ownership matrix remains authoritative in `docs/AUTHORIZATION-MATRIX.md`.
> Static scans flag decorators only; ownership scoping is enforced in service layer (see `docs/FINAL-BUG-REPORT.md`).

## Summary (by access class)

| Access | Routes |
|--------|--------|
| Public | 24 |
| CUSTOMER | 68 |
| SELLER | 17 |
| ADMIN | 58 |
| **Total** | **167** |

---

### admin

| Method | Path | Access |
|--------|------|--------|
| GET | `/api/admin/dashboard` | ADMIN |
| GET | `/api/admin/orders` | ADMIN |
| GET | `/api/admin/products` | ADMIN |
| GET | `/api/admin/sellers` | ADMIN |
| GET | `/api/admin/sellers/{id}` | ADMIN |
| PUT | `/api/admin/sellers/{id}/role` | ADMIN |
| PUT | `/api/admin/sellers/{id}/status` | ADMIN |
| GET | `/api/admin/users` | ADMIN |
| GET | `/api/admin/users/{id}` | ADMIN |
| PUT | `/api/admin/users/{id}/role` | ADMIN |

### admin-audit-logs

| Method | Path | Access |
|--------|------|--------|
| GET | `/api/admin/audit-logs` | ADMIN |

### admin-exports

| Method | Path | Access |
|--------|------|--------|
| GET | `/api/admin/exports/{resource}` | ADMIN |

### admin-orders

| Method | Path | Access |
|--------|------|--------|
| GET | `/api/admin/orders` | ADMIN |
| GET | `/api/admin/orders/{id}` | ADMIN |
| GET | `/api/admin/orders/{id}/history` | ADMIN |
| PATCH | `/api/admin/orders/{id}/status` | ADMIN |
| GET | `/api/admin/orders/dashboard` | ADMIN |

### admin-returns

| Method | Path | Access |
|--------|------|--------|
| GET | `/api/admin/returns` | ADMIN |
| GET | `/api/admin/returns/{id}` | ADMIN |
| PATCH | `/api/admin/returns/{id}/status` | ADMIN |

### admin-support

| Method | Path | Access |
|--------|------|--------|
| GET | `/api/admin/support/tickets` | ADMIN |
| GET | `/api/admin/support/tickets/{id}` | ADMIN |
| POST | `/api/admin/support/tickets/{id}/messages` | ADMIN |
| PATCH | `/api/admin/support/tickets/{id}/status` | ADMIN |

### alerts

| Method | Path | Access |
|--------|------|--------|
| GET | `/api/alerts` | CUSTOMER |
| POST | `/api/products/{id}/stock-alert` | CUSTOMER |
| GET | `/api/products/{id}/stock-alert` | CUSTOMER |
| DELETE | `/api/products/{id}/stock-alert` | CUSTOMER |
| POST | `/api/wishlist/{productId}/price-alert` | CUSTOMER |
| DELETE | `/api/wishlist/{productId}/price-alert` | CUSTOMER |

### analytics

| Method | Path | Access |
|--------|------|--------|
| GET | `/api/admin/analytics/low-stock-threshold` | ADMIN |
| PUT | `/api/admin/analytics/low-stock-threshold` | ADMIN |
| GET | `/api/admin/analytics/orders` | ADMIN |
| GET | `/api/admin/analytics/overview` | ADMIN |
| GET | `/api/admin/analytics/products` | ADMIN |
| GET | `/api/admin/analytics/sales` | ADMIN |
| GET | `/api/seller/analytics/overview` | SELLER |

### auth

| Method | Path | Access |
|--------|------|--------|
| POST | `/api/auth/logout` | CUSTOMER |
| GET | `/api/auth/me` | CUSTOMER |
| POST | `/api/auth/refresh` | Public |
| POST | `/api/auth/send-otp` | Public |
| POST | `/api/auth/verify-otp` | Public |

### cart

| Method | Path | Access |
|--------|------|--------|
| GET | `/api/cart` | CUSTOMER |
| POST | `/api/cart` | CUSTOMER |
| DELETE | `/api/cart` | CUSTOMER |
| PUT | `/api/cart/{itemId}` | CUSTOMER |
| DELETE | `/api/cart/{itemId}` | CUSTOMER |

### categories

| Method | Path | Access |
|--------|------|--------|
| GET | `/api/categories` | Public |
| GET | `/api/categories/{slug}` | Public |
| GET | `/api/categories/{slug}/products` | Public |

### checkout

| Method | Path | Access |
|--------|------|--------|
| POST | `/api/checkout/buynow` | CUSTOMER |
| POST | `/api/checkout/cartbuynow` | CUSTOMER |
| POST | `/api/checkout/preview` | CUSTOMER |

### coupons

| Method | Path | Access |
|--------|------|--------|
| GET | `/api/coupons` | ADMIN |
| GET | `/api/coupons/{id}` | ADMIN |
| POST | `/api/coupons/admin` | ADMIN |
| PATCH | `/api/coupons/admin/{id}` | ADMIN |
| DELETE | `/api/coupons/admin/{id}` | ADMIN |
| POST | `/api/coupons/apply` | CUSTOMER |
| POST | `/api/coupons/remove` | CUSTOMER |
| POST | `/api/coupons/validate` | Public |

### csrf

| Method | Path | Access |
|--------|------|--------|
| GET | `/api/csrf` | Public |

### health

| Method | Path | Access |
|--------|------|--------|
| GET | `/api/health` | Public |
| GET | `/api/health/live` | Public |
| GET | `/api/health/ready` | Public |

### inventory

| Method | Path | Access |
|--------|------|--------|
| GET | `/api/inventory/{productId}` | SELLER |
| PUT | `/api/inventory/{productId}` | SELLER |

### invoices

| Method | Path | Access |
|--------|------|--------|
| GET | `/api/invoices/admin` | ADMIN |
| GET | `/api/invoices/mine` | CUSTOMER |
| GET | `/api/invoices/order/{id}` | CUSTOMER |

### metrics

| Method | Path | Access |
|--------|------|--------|
| GET | `/api/metrics` | ADMIN |
| GET | `/api/metrics/queues` | ADMIN |

### notifications

| Method | Path | Access |
|--------|------|--------|
| GET | `/api/notifications` | CUSTOMER |
| PATCH | `/api/notifications/{id}/read` | CUSTOMER |
| GET | `/api/notifications/preferences` | CUSTOMER |
| PUT | `/api/notifications/preferences` | CUSTOMER |
| PATCH | `/api/notifications/read-all` | CUSTOMER |
| GET | `/api/notifications/unread-count` | CUSTOMER |

### orders

| Method | Path | Access |
|--------|------|--------|
| GET | `/api/orders` | CUSTOMER |
| GET | `/api/orders/{id}` | CUSTOMER |
| DELETE | `/api/orders/{id}` | CUSTOMER |
| POST | `/api/orders/{id}/cancel` | CUSTOMER |
| GET | `/api/orders/{id}/history` | CUSTOMER |
| GET | `/api/orders/{id}/invoice` | CUSTOMER |
| PUT | `/api/orders/{id}/status` | ADMIN |
| GET | `/api/orders/{id}/tracking` | CUSTOMER |
| GET | `/api/orders/all` | ADMIN |
| GET | `/api/orders/dashboard` | ADMIN |

### payments

| Method | Path | Access |
|--------|------|--------|
| GET | `/api/payments/{id}/status` | CUSTOMER |
| POST | `/api/payments/{paymentId}/refund` | ADMIN |
| POST | `/api/payments/checkout` | CUSTOMER |
| GET | `/api/payments/checkout/{checkoutId}/status` | CUSTOMER |
| POST | `/api/payments/cod/confirm` | CUSTOMER |
| POST | `/api/payments/create-order` | CUSTOMER |
| POST | `/api/payments/retry` | CUSTOMER |
| POST | `/api/payments/verify` | CUSTOMER |
| POST | `/api/payments/webhook` | Public |

### products

| Method | Path | Access |
|--------|------|--------|
| GET | `/api/products` | Public |
| POST | `/api/products` | ADMIN |
| GET | `/api/products/{id}` | Public |
| PATCH | `/api/products/{id}` | ADMIN |
| DELETE | `/api/products/{id}` | ADMIN |
| GET | `/api/products/{id}/frequently-bought-together` | Public |
| POST | `/api/products/{id}/images` | ADMIN |
| DELETE | `/api/products/{id}/images/{imageId}` | ADMIN |
| GET | `/api/products/{id}/related` | Public |
| POST | `/api/products/{id}/restore` | ADMIN |
| GET | `/api/products/admin/all` | ADMIN |
| GET | `/api/products/homepage` | Public |
| GET | `/api/products/search` | Public |

### refunds

| Method | Path | Access |
|--------|------|--------|
| POST | `/api/refunds` | CUSTOMER |
| GET | `/api/refunds` | CUSTOMER |
| GET | `/api/refunds/{id}` | CUSTOMER |
| GET | `/api/refunds/admin` | ADMIN |

### returns

| Method | Path | Access |
|--------|------|--------|
| POST | `/api/returns` | CUSTOMER |
| GET | `/api/returns` | CUSTOMER |
| GET | `/api/returns/{id}` | CUSTOMER |
| GET | `/api/returns/admin` | ADMIN |
| PATCH | `/api/returns/admin/{id}` | ADMIN |

### reviews

| Method | Path | Access |
|--------|------|--------|
| POST | `/api/reviews` | CUSTOMER |
| PATCH | `/api/reviews/{id}` | CUSTOMER |
| DELETE | `/api/reviews/{id}` | CUSTOMER |
| PATCH | `/api/reviews/{id}/moderate` | ADMIN |
| GET | `/api/reviews/my` | CUSTOMER |
| GET | `/api/reviews/product/{productId}` | Public |
| GET | `/api/reviews/product/{productId}/admin` | ADMIN |
| GET | `/api/reviews/product/{productId}/can-review` | CUSTOMER |

### search

| Method | Path | Access |
|--------|------|--------|
| GET | `/api/search/popular` | Public |
| GET | `/api/search/suggestions` | Public |

### seller-orders

| Method | Path | Access |
|--------|------|--------|
| GET | `/api/seller/orders` | SELLER |
| GET | `/api/seller/orders/{id}` | SELLER |
| PATCH | `/api/seller/orders/{id}/status` | SELLER |

### sellers

| Method | Path | Access |
|--------|------|--------|
| GET | `/api/sellers/dashboard` | SELLER |
| GET | `/api/sellers/inventory` | SELLER |
| POST | `/api/sellers/login` | Public |
| POST | `/api/sellers/logout` | SELLER |
| GET | `/api/sellers/me` | SELLER |
| GET | `/api/sellers/orders` | SELLER |
| GET | `/api/sellers/orders/{id}` | SELLER |
| PUT | `/api/sellers/orders/{id}/status` | SELLER |
| GET | `/api/sellers/products` | SELLER |
| GET | `/api/sellers/products/{id}` | SELLER |
| GET | `/api/sellers/profile` | SELLER |
| PUT | `/api/sellers/profile` | SELLER |
| POST | `/api/sellers/signup` | Public |

### shipping

| Method | Path | Access |
|--------|------|--------|
| GET | `/api/shipping/calculate` | Public |
| GET | `/api/shipping/config` | ADMIN |
| PUT | `/api/shipping/config` | ADMIN |

### support

| Method | Path | Access |
|--------|------|--------|
| POST | `/api/support/tickets` | CUSTOMER |
| GET | `/api/support/tickets` | CUSTOMER |
| GET | `/api/support/tickets/{id}` | CUSTOMER |
| PATCH | `/api/support/tickets/{id}/close` | CUSTOMER |
| POST | `/api/support/tickets/{id}/messages` | CUSTOMER |

### tax

| Method | Path | Access |
|--------|------|--------|
| GET | `/api/tax/config` | ADMIN |
| PUT | `/api/tax/config` | ADMIN |

### users

| Method | Path | Access |
|--------|------|--------|
| GET | `/api/users/addresses` | CUSTOMER |
| POST | `/api/users/addresses` | CUSTOMER |
| GET | `/api/users/addresses/{id}` | CUSTOMER |
| PATCH | `/api/users/addresses/{id}` | CUSTOMER |
| DELETE | `/api/users/addresses/{id}` | CUSTOMER |
| PATCH | `/api/users/addresses/{id}/default` | CUSTOMER |
| GET | `/api/users/me` | CUSTOMER |
| PATCH | `/api/users/me` | CUSTOMER |

### wishlist

| Method | Path | Access |
|--------|------|--------|
| GET | `/api/wishlist` | CUSTOMER |
| DELETE | `/api/wishlist` | CUSTOMER |
| POST | `/api/wishlist/{productId}/move-to-cart` | CUSTOMER |
| POST | `/api/wishlist/toggle` | CUSTOMER |
