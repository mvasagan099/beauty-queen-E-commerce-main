# API.md — Beauty Queen REST API Reference

**Base URL:** `/api` (global prefix)
**Default port:** `5000`
**Interactive docs (dev only):** `/api/docs` (Swagger)

---

## Authentication & Authorization

- **Customer**: Email OTP login → JWT access/refresh tokens in **httpOnly cookies** (`access_token`, `refresh_token`, `SameSite=Lax`, `Secure` in production).
- **Seller / Admin**: Password login → same JWT cookie scheme; seller passwords are bcrypt-hashed.
- Client sends the auth cookie automatically; `Authorization: Bearer <token>` is also accepted.
- Guards:
  - `JwtAuthGuard` — requires a valid access token.
  - `RolesGuard` + `@Roles(...)` — role values `CUSTOMER`/`SELLER`/`ADMIN`.
- **Roles legend** below: `Public` = no auth; `JWT` = any authenticated user; `SELLER`/`ADMIN` = role-required.

---

## Core Request Conventions

- **JSON** bodies; `Content-Type: application/json`.
- **Multipart** for product image uploads (max 5 images).
- **Validation**: global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`) — unexpected fields are rejected.
- **Errors**: consistent `{ statusCode, message, error, requestId }` shape. Internal errors return a generic message in production.
- **Pagination** (where supported): `page`, `limit` query params; responses return `pagination: { page, limit, total, totalPages }`.

---

## 1. Auth — `/api/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/send-otp` | Public (rate-limited) | Send OTP to `{ email }` via Brevo |
| POST | `/auth/verify-otp` | Public (rate-limited) | Verify `{ email, otp }`; on success set access/refresh cookies |
| POST | `/auth/refresh` | Public | Refresh access token from refresh token |
| POST | `/auth/logout` | JWT | Revoke tokens, clear cookies |
| GET | `/auth/me` | JWT | Current user |

## 2. Users & Addresses — `/api/users`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/users/me` | JWT | Profile |
| PATCH | `/users/me` | JWT | Update profile |
| GET | `/users/addresses` | JWT | List addresses |
| GET | `/users/addresses/:id` | JWT | Single address |
| POST | `/users/addresses` | JWT | Create address |
| PATCH | `/users/addresses/:id` | JWT | Update address |
| PATCH | `/users/addresses/:id/default` | JWT | Set default address |
| DELETE | `/users/addresses/:id` | JWT | Delete address |

## 3. Products — `/api/products`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/products` | Public | List/products with `category`, `sort`, `search`, `minPrice`, `maxPrice`, `inStock`, `page`, `limit` |
| GET | `/products/homepage` | Public | Homepage data (featured/new/categories) |
| GET | `/products/search?q=` | Public (rate-limited) | Search by query |
| GET | `/products/admin/all` | SELLER/ADMIN | All products incl. inactive/deleted |
| GET | `/products/:id/related` | Public | Related products (same category, in-stock) |
| GET | `/products/:id` | Public | Product detail |
| POST | `/products` | SELLER/ADMIN | Create product (multipart, ≤5 images) |
| PATCH | `/products/:id` | SELLER/ADMIN | Update product (multipart, optional images) |
| DELETE | `/products/:id` | SELLER/ADMIN | Soft delete |
| POST | `/products/:id/images` | SELLER/ADMIN | Add image |
| DELETE | `/products/:id/images/:imageId` | SELLER/ADMIN | Remove image |
| POST | `/products/:id/restore` | SELLER/ADMIN | Restore soft-deleted product |

## 4. Categories — `/api/categories`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/categories` | Public | All categories |
| GET | `/categories/:slug/products` | Public | Category products (page/limit/sort/price) |
| GET | `/categories/:slug` | Public | Category by slug |

## 5. Cart — `/api/cart`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/cart` | JWT | Cart with server-calculated totals |
| POST | `/cart` | JWT | Add item |
| PUT | `/cart/:itemId` | JWT | Update quantity |
| DELETE | `/cart/:itemId` | JWT | Remove item |
| DELETE | `/cart` | JWT | Clear cart |

## 6. Checkout — `/api/checkout`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/checkout/preview` | JWT | Preview pricing (no order) |
| POST | `/checkout/buynow` | JWT | Buy now order |
| POST | `/checkout/cartbuynow` | JWT | Checkout entire cart |

## 7. Orders — `/api/orders`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/orders` | JWT | Current user's orders |
| GET | `/orders/all` | ADMIN | All orders (status, search) |
| GET | `/orders/dashboard` | ADMIN | Order dashboard stats |
| GET | `/orders/:id` | JWT | Order detail (owner) |
| POST | `/orders/:id/cancel` | JWT | Cancel order (owner, Pending/Confirmed/Processing) |
| GET | `/orders/:id/tracking` | JWT | Tracking (owner) |
| GET | `/orders/:id/invoice` | JWT | Invoice (owner) |
| PUT | `/orders/:id/status` | ADMIN | Update status |
| DELETE | `/orders/:id` | ADMIN | Delete order |
| GET | `/orders/:id/history` | JWT | Status history (service-level ownership) |

## 8. Payments — `/api/payments`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/payments/checkout` | JWT (rate-limited) | Validate cart, create orders, get amount |
| POST | `/payments/create-order` | JWT (rate-limited) | Create/reuse Razorpay order |
| POST | `/payments/verify` | JWT (rate-limited) | Verify signature + provider cross-check, confirm order |
| POST | `/payments/cod/confirm` | JWT (rate-limited) | Confirm COD order |
| POST | `/payments/retry` | JWT (rate-limited) | Retry failed payment (checkoutId) |
| GET | `/payments/:id/status` | JWT | Payment status |
| GET | `/payments/checkout/:checkoutId/status` | JWT | Payment status by checkout |
| POST | `/payments/:paymentId/refund` | ADMIN (rate-limited) | Full/partial refund via Razorpay |
| POST | `/payments/webhook` | Public (signature-verified) | Razorpay webhook (captured/failed/authorized/refund.*) |

## 9. Sellers — `/api/sellers`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/sellers/signup` | Public | Seller signup |
| POST | `/sellers/login` | Public | Login (bcrypt) → cookies |
| POST | `/sellers/logout` | SELLER | Logout, clear cookies |
| GET | `/sellers/me` | SELLER | Current seller |
| GET | `/sellers/profile` | SELLER | Detailed profile |
| PUT | `/sellers/profile` | SELLER | Update profile |
| GET | `/sellers/dashboard` | SELLER | Dashboard stats |
| GET | `/sellers/inventory` | SELLER | Inventory + low-stock |
| GET | `/sellers/products` | SELLER | Own products (page/limit/search) |
| GET | `/sellers/products/:id` | SELLER | Own product |
| GET | `/sellers/orders` | SELLER | Own orders (status/search) |
| GET | `/sellers/orders/:id` | SELLER | Own order detail |
| PUT | `/sellers/orders/:id/status` | SELLER | Update order status |

## 10. Seller Orders — `/api/seller/orders`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/seller/orders` | SELLER | Orders (status/paymentStatus/search/page/limit) |
| PATCH | `/seller/orders/:id/status` | SELLER | Update status |
| GET | `/seller/orders/:id` | SELLER | Order detail |

## 11. Admin — `/api/admin`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/dashboard` | ADMIN | Dashboard stats |
| GET | `/admin/sellers` | ADMIN | Sellers |
| GET | `/admin/sellers/:id` | ADMIN | Seller detail |
| PUT | `/admin/sellers/:id/status` | ADMIN | Toggle seller active |
| PUT | `/admin/sellers/:id/role` | ADMIN | Update user role |
| GET | `/admin/products` | ADMIN | All products (page/limit/search/category/status) |
| GET | `/admin/orders` | ADMIN | All orders (status/search) |
| GET | `/admin/users` | ADMIN | Users |
| GET | `/admin/users/:id` | ADMIN | User detail |
| PUT | `/admin/users/:id/role` | ADMIN | Update user role |

## 12. Admin Orders — `/api/admin/orders`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/orders` | ADMIN | Orders (status/search/paymentStatus/date/page/limit) |
| GET | `/admin/orders/dashboard` | ADMIN | Order metrics |
| GET | `/admin/orders/:id` | ADMIN | Order detail |
| PATCH | `/admin/orders/:id/status` | ADMIN | Update status |
| GET | `/admin/orders/:id/history` | ADMIN | Status history |

## 13. Admin Audit Logs — `/api/admin/audit-logs`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/audit-logs` | ADMIN | Logs (action/entityType/actorId/actorRole/startDate/endDate/page/limit) |

## 14. Analytics — `/api/admin/analytics` & `/api/seller/analytics`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/analytics/overview` | ADMIN | Overview metrics |
| GET | `/admin/analytics/sales` | ADMIN | Sales metrics |
| GET | `/admin/analytics/orders` | ADMIN | Order metrics |
| GET | `/admin/analytics/products` | ADMIN | Product/inventory metrics |
| GET | `/admin/analytics/low-stock-threshold` | ADMIN | Low-stock threshold |
| PUT | `/admin/analytics/low-stock-threshold` | ADMIN | Update threshold |
| GET | `/seller/analytics/overview` | SELLER | Seller-scoped overview |

## 15. Reviews — `/api/reviews`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/reviews/product/:productId` | Public | Approved reviews for product |
| GET | `/reviews/product/:productId/admin` | ADMIN | All reviews (incl. pending/rejected) |
| GET | `/reviews/my` | JWT | Own reviews |
| GET | `/reviews/product/:productId/can-review` | JWT | Verified-purchase eligibility |
| POST | `/reviews` | JWT | Create review |
| PATCH | `/reviews/:id` | JWT | Update (owner) |
| PATCH | `/reviews/:id/moderate` | ADMIN | Moderate (approve/reject) |
| DELETE | `/reviews/:id` | JWT | Delete (owner) |

## 16. Wishlist — `/api/wishlist`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/wishlist` | JWT | Wishlist |
| POST | `/wishlist/toggle` | JWT | Toggle product |
| DELETE | `/wishlist` | JWT | Clear wishlist |

## 17. Coupons — `/api/coupons`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/coupons/validate` | JWT | Validate coupon against amount |
| POST | `/coupons/apply` | JWT | Apply coupon |
| POST | `/coupons/remove` | JWT | Remove applied coupon |
| GET | `/coupons` | ADMIN | All coupons |
| GET | `/coupons/:id` | ADMIN | Coupon by id |
| POST | `/coupons/admin` | ADMIN | Create coupon |
| PATCH | `/coupons/admin/:id` | ADMIN | Update coupon |
| DELETE | `/coupons/admin/:id` | ADMIN | Delete coupon |

## 18. Inventory — `/api/inventory`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/inventory/:productId` | SELLER/ADMIN | Stock for product |
| PUT | `/inventory/:productId` | SELLER/ADMIN | Update stock for a size |

## 19. Notifications — `/api/notifications`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/notifications` | JWT | Notifications (paginated) |
| GET | `/notifications/unread-count` | JWT | Unread count |
| PATCH | `/notifications/:id/read` | JWT | Mark read |
| PATCH | `/notifications/read-all` | JWT | Mark all read |

## 20. Shipping — `/api/shipping`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/shipping/config` | ADMIN | Shipping config |
| PUT | `/shipping/config` | ADMIN | Update shipping config |
| GET | `/shipping/calculate` | Public | Calculate shipping (subtotal/pincode) |

## 21. Tax — `/api/tax`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/tax/config` | ADMIN | Tax config |
| PUT | `/tax/config` | ADMIN | Update tax config |

## 22. Returns — `/api/returns`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/returns` | JWT | Request return (owner) |
| GET | `/returns` | JWT | Own returns |
| GET | `/returns/admin` | ADMIN | All returns |
| GET | `/returns/:id` | JWT | Return detail (owner) |
| PATCH | `/returns/admin/:id` | ADMIN | Update status |

## 23. Admin Returns — `/api/admin/returns`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/returns` | ADMIN | All returns |
| GET | `/admin/returns/:id` | ADMIN | Return detail |
| PATCH | `/admin/returns/:id/status` | ADMIN | Update status |

## 24. Refunds — `/api/refunds`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/refunds` | JWT | Request refund (owner) |
| GET | `/refunds` | JWT | Own refunds |
| GET | `/refunds/admin` | ADMIN | All refunds |
| GET | `/refunds/:id` | JWT | Refund detail (owner) |

## 25. Invoices — `/api/invoices`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/invoices/mine` | JWT | Own invoices |
| GET | `/invoices/admin` | ADMIN | All invoices |
| GET | `/invoices/order/:id` | JWT | Invoice for order (owner) |

## 26. Health — `/api/health`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | Public | Full health: DB + Redis, uptime |
| GET | `/health/live` | Public | Liveness |
| GET | `/health/ready` | Public | Readiness (DB ping) |

## 27. CSRF — `/api/csrf`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/csrf` | Public | Issue double-submit CSRF token cookie (opt-in) |

---

## Error Response Shape

```json
{
  "statusCode": 404,
  "message": "Order not found",
  "error": "Not Found",
  "requestId": "req-abc123"
}
```

## Rate Limiting

- OTP send/verify: per email + per IP (see `OtpRateLimitGuard`).
- Payment money endpoints (checkout, create-order, verify, retry, refund, COD): Redis-backed `RateLimitGuard`.
- Search: `SearchRateLimitInterceptor`.

## Notes & Known Caveats

- `/api/orders/:id/history` ownership is enforced at the service level; controller passes the id.
- `OwnershipGuard` and `CsrfGuard` are implemented and exported but not attached to endpoints by default (CSRF is mitigated via SameSite=Lax + HttpOnly; the guard is available for opt-in hardening).
- Swagger is only enabled in non-production environments.

---

# Phase 17 — Advanced Capability Endpoints (2026-08-28)

## Search

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/products/search?q=&page=&limit=&sort=` | Public | Ranked search; `sort` ∈ `price_asc` / `price_desc` / `newest` (rank always tiebreaker) |
| GET | `/search/suggestions?q=` | Public | Product name suggestions for the autocomplete box |
| GET | `/search/popular` | Public | Popular queries (aggregated from `search_queries`) |

## Frequently Bought Together

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/products/:id/frequently-bought?limit=` | Public | Products purchased alongside `:id` (ordered orders aggregate, non-deleted, excludes self) |

## Wishlist → Cart

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/wishlist/:id/move-to-cart` | Customer | Moves wishlist item into the cart (stock-aware, size-aware), deletes the row |

## Notification Preferences

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/notifications/preferences` | Customer | Returns `{ success, preferences }` (orderUpdates/paymentUpdates/promotional) |
| PUT | `/notifications/preferences` | Customer | Updates the three toggleable preferences (admin-reserved keys rejected) |

## Alerts (Back-in-stock & Price drops)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/alerts/my` | Customer | Both alert lists with product summary |
| POST | `/alerts/stock` | Customer | Create stock alert `{ productId, size? }` (404 if product missing; 400 if already in stock) |
| GET | `/alerts/stock/:productId` | Customer | Current stock alert state |
| POST | `/alerts/stock/:productId/cancel` | Customer | Cancel stock alert |
| POST | `/alerts/price` | Customer | Create price alert `{ productId, watchedPrice }` |
| POST | `/alerts/price/:productId/cancel` | Customer | Cancel price alert |

## Support Tickets

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/support/tickets` | Customer | Create `{ subject, body, orderId? }`; order must be owned; returns numbered ticket |
| GET | `/support/tickets` | Customer | My tickets (last message preview) |
| GET | `/support/tickets/:id` | Customer | Detail — internal notes always excluded |
| POST | `/support/tickets/:id/reply` | Customer | Reply (blocked when closed) |
| POST | `/support/tickets/:id/close` | Customer | Close |
| GET | `/support/tickets/admin` | Admin | Filters: status/priority/search + page/limit |
| GET | `/support/tickets/admin/:id` | Admin | Detail incl. internal notes, customer + order info |
| POST | `/support/tickets/admin/:id/reply` | Admin | `{ body, isInternal? }`; public replies email the customer |
| PATCH | `/support/tickets/admin/:id/status` | Admin | `{ status }` (OPEN/IN_PROGRESS/RESOLVED/CLOSED); resolution/closure emails |

## Admin Exports & Analytics

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/exports/:resource` | Admin | CSV stream for `orders`·`products`·`customers`·`refunds`·`sales`; BOM + headers; audited as `ADMIN_EXPORT` |
| GET | `/admin/analytics?range=` | Admin | Now supports `7d`·`30d`·`90d`·custom |
| PUT | `/admin/analytics/set-low-stock-threshold` | Admin | Rejects non-integer/negative values with 400 |

> All Phase 17 customer mutating endpoints enforce ownership; support emails use deterministic eventIds (`support-ticket:{ticketId}:{eventType}`); alert emails use `back-in-stock:{id}` / `price-drop:{id}` for idempotency.
