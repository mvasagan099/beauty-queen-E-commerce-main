# DATABASE.md — Beauty Queen Data Model

**Database:** MySQL 8+ · **ORM:** Prisma 5 (`prisma/schema.prisma` at repo root)
**Key config:** `relationMode = "prisma"` (explicit relation columns), `provider = "mysql"`.

---

## Schema Source of Truth

The schema lives at the repository root: **`prisma/schema.prisma`**.
Commands are aliased at the repo root (`package.json`) and in `apps/api/package.json`:

```bash
npm run db:generate   # prisma generate
npm run db:migrate    # prisma migrate dev
npm run db:seed       # ts-node prisma/seed.ts
npm run db:studio     # prisma studio
```

The API resolves it via `--schema=../../prisma/schema.prisma`.

---

## Models (tables)

| Model | Table | Purpose |
|-------|-------|---------|
| `User` | `users` | Customers; `role` enum CUSTOMER/SELLER/ADMIN; unique email |
| `Seller` | `seller` | Seller accounts (bcrypt password, mobile, active flag) |
| `RefreshToken` | `refresh_tokens` | JWT refresh tokens (rotation, revocation) |
| `Product` | `products` | Product with per-size stock (size_s…size_xxl), soft-delete `deletedAt`, `sellerId` |
| `Order` | `orders` | Order line item; snapshot fields (price, subtotal, discount, shipping, tax, total, address) |
| `OrderStatusHistory` | `order_status_history` | Audit trail of status transitions |
| `OrderEvent` | `order_events` | Event timeline (cancel, return, etc.) |
| `CartItem` | `cart_items` | User cart (unique user+product+size) |
| `Address` | `addresses` | Saved customer addresses (default flag) |
| `Review` | `reviews` | Product reviews/ratings; moderation status; verified purchase |
| `WishlistItem` | `wishlist_items` | Wishlist (unique user+product) |
| `Coupon` | `coupons` | Discount coupons (PERCENTAGE/FIXED_AMOUNT, limits, dates) |
| `CouponUsage` | `coupon_usages` | Coupon usage tracking per user/order |
| `Payment` | `payments` | Payment records; Razorpay status, signature-verified flag, metadata |
| `PaymentWebhookEvent` | `payment_webhook_events` | Idempotent webhook event store |
| `Invoice` | `invoices` | Historical invoice snapshots (never live prices) |
| `ReturnRequest` | `return_requests` | Return lifecycle |
| `Refund` | `refunds` | Refund lifecycle (provider refund id) |
| `Notification` | `notifications` | In-app notifications |
| `NotificationPreference` | `notification_preferences` | Notification opt-in flags |
| `AuditLog` | `audit_logs` | Admin action audit trail |
| `SiteConfig` | `site_config` | Runtime config (shipping, tax, low-stock threshold) |

## Enums

| Enum | Values |
|------|--------|
| `Role` | CUSTOMER, SELLER, ADMIN |
| `OrderStatus` | Pending, Confirmed, Processing, Shipped, Delivered, Cancelled, Refunded |
| `PaymentStatus` | Pending, Completed, Failed, Refunded |
| `RazorpayPaymentStatus` | PENDING, AUTHORIZED, CAPTURED, FAILED, REFUNDED, PARTIALLY_REFUNDED |
| `ReviewStatus` | PENDING, APPROVED, REJECTED |
| `CouponType` | PERCENTAGE, FIXED_AMOUNT |
| `ReturnStatus` | REQUESTED, APPROVED, REJECTED, PICKUP_PENDING, RECEIVED, COMPLETED, CANCELLED |
| `RefundStatus` | PENDING, PROCESSING, COMPLETED, FAILED |

---

## Key Relationships & Constraints

- `User 1—N Order` (via `userId`), `Order N—1 Product`, `Order N—1 Seller`
- `Order 1—N OrderStatusHistory`, `Order 1—N OrderEvent`, `Order 1—N ReturnRequest`, `Order 1—N Invoice`
- `User 1—N CartItem | Address | Review | WishlistItem | Payment | ReturnRequest | Refund | Notification | Invoice`
- `Product 1—N Review | WishlistItem | CartItem | Order`
- `Coupon 1—N CouponUsage`
- `ReturnRequest 1—N Refund`
- `User 1—1 NotificationPreference`

### Unique Constraints
- `users.email`
- `refresh_tokens.token`
- `cart_items(userId, productId, size)`
- `reviews(userId, productId)` — one review per user/product
- `wishlist_items(userId, productId)` — duplicate prevention
- `coupons.code`
- `payment.providerOrderId`, `payment.providerPaymentId`
- `payment_webhook_events.providerEventId` — idempotency
- `invoices.invoiceNumber`
- `notification_preferences.userId`
- `site_config.key`

### Cascade Rules
- `RefreshToken`, `CartItem`, `Address`, `Review`, `WishlistItem`, `Notification`, `NotificationPreference` → **CASCADE** on user delete
- `OrderEvent` → CASCADE on order delete
- Products/Orders/Payments are **not** hard-deleted in normal operation (soft delete for products; orders/payments preserved for history)

---

## Indexes (hot query paths)

- `Product`: `sellerId`, `ptype`, `price`, `deletedAt`, `createdAt`
- `Order`: `email`, `status`, `productId`, `checkoutId`, `userId`, `sellerId`, `orderDate`
- `OrderStatusHistory`: `orderId`
- `CartItem`: `userId` (unique compound)
- `Address`: `userId`
- `Review`: `productId`, `status` (+ unique user+product)
- `WishlistItem`: `productId`
- `CouponUsage`: `couponId`, `userId`
- `Payment`: `checkoutId`, `userId`
- `PaymentWebhookEvent`: `processed`, `createdAt`, `paymentId`
- `ReturnRequest`: `orderId`, `userId`, `status`
- `Refund`: `checkoutId`, `userId`, `status`, `returnRequestId`
- `Notification`: `userId`, `(userId, readAt)`, `createdAt`
- `OrderEvent`: `orderId`, `createdAt`
- `AuditLog`: `(entityType, entityId)`, `actorId`, `createdAt`
- `Seller`: `email`, `mobile`

See `docs/INDEXES.md` for the detailed index rationale.

---

## Migration Workflow (Phase 12 rule — never reset production)

1. Edit `prisma/schema.prisma`.
2. `npm run db:migrate -- --name <description>` generates SQL (review `migrations/*/migration.sql`).
3. Test against a copy/test database first.
4. Verify existing data is unaffected; run application tests.
5. Only then run `prisma migrate deploy` on staging, then production.
6. **Never** run `prisma migrate reset` against production.

---

## Data Integrity Guarantees

- **Historical orders/payments** are protected from product changes: `Order` stores a `price`, `subtotal`, `discountAmount`, `shippingAmount`, `taxAmount`, `totalAmount` **snapshot** and the full address snapshot at creation. `Invoice` stores its own item snapshot (`items Json` + totals). Later product edits do not retroactively change these.
- **Transactionality**: stock decrement, order creation, cart clearing, coupon consumption, and default-address switching run inside Prisma `$transaction` (with `SELECT ... FOR UPDATE` row-locking for stock).
- **Idempotency**: `PaymentWebhookEvent.providerEventId` is unique; refunds guard against duplicates.

---

## Environment / Connection

- `DATABASE_URL="mysql://user:pass@host:3306/beauty_queen"` (`.env`, gitignored; see `.env.example`).
- Use least-privilege DB user in production (not root).
- Production: never expose the DB publicly; enable TLS and connection pooling for scaled instances (see `docs/DEPLOYMENT.md`).
- Backup/restore procedure: `docs/BACKUP-RESTORE.md`.

---

# Phase 17 — Schema Additions (2026-08-28)

Migration: the Phase 17 models are part of the regenerated single baseline `20260828000000_init` (see `docs/DATABASE-MIGRATION-MATRIX.md`). Applying `prisma migrate deploy` from scratch rebuilds the full schema including Phase 17 tables. No separate incremental migration exists; the baseline has not been applied to a live DB yet.

| Model / table | Additions | Notes |
|---------------|-----------|-------|
| `stock_alerts` | NEW | `userId+productId` unique, `status` (WAITING/CANCELLED/TRIGGERED), optional `size`, `email`, notify timestamps; referenced by deterministic `back-in-stock:{id}` emails |
| `price_alerts` | NEW | `userId+productId` unique, `status` (WATCHING/CANCELLED/TRIGGERED), `watchedPrice`; `price-drop:{id}` emails |
| `notification_preferences` | NEW | One row per user; `orderUpdates` / `paymentUpdates` / `promotional` toggles (admin-reserved flags) |
| `support_tickets` | NEW | `ticketNumber` (`BQ-TKT-00001`), `userId`, optional `orderId`, `status`, `priority`, `lastActivity`, `resolvedAt`, `closedAt` |
| `support_messages` | NEW | `ticketId`, `authorRole` (CUSTOMER/ADMIN), `authorId`, `body`, `isInternal` (internal notes hidden from customers) |
| `abandoned_cart_emails` | NEW | Dedup for cart reminders (`userId+cartItemId` event), sent/triggered tracking |
| `search_queries` | Existing | re-used 90d window for `GET /search/popular` |
| `audit_log` | ENUM +INSERT | `ADMIN_EXPORT` action added; ticket/reply operations logged |

Indexes preserved per `docs/INDEXES.md`; all new unique constraints (alert rows, preference rows, ticket numbers) enforce idempotency.

---

## Related Docs

- `docs/INDEXES.md` — index rationale
- `docs/DATABASE-MIGRATION-MATRIX.md` — migration history by phase
- `docs/ROLLBACK-PLAN.md` — schema rollback strategy
- `docs/DATABASE-AUDIT.md` (repo root) — legacy→new data migration audit
