# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                      Client                              │
│                  (Browser/Mobile)                        │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTPS
                      ▼
┌─────────────────────────────────────────────────────────┐
│                   Next.js Frontend                       │
│                   (Port 3000)                            │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │  Pages   │  │Components│  │  Hooks   │  │  Store  │ │
│  └─────────┘  └──────────┘  └──────────┘  └─────────┘ │
└─────────────────────┬───────────────────────────────────┘
                      │ API Proxy (/api/*)
                      ▼
┌─────────────────────────────────────────────────────────┐
│                   NestJS API                             │
│                   (Port 5000)                            │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │ Modules  │  │Guards    │  │Intercept │  │ Filters │ │
│  └─────────┘  └──────────┘  └──────────┘  └─────────┘ │
└────┬──────────────┬──────────────┬──────────────────────┘
     │              │              │
     ▼              ▼              ▼
┌─────────┐  ┌──────────┐  ┌──────────┐
│ Prisma  │  │  Redis   │  │ BullMQ   │
│  (ORM)  │  │ (Cache)  │  │ (Queue)  │
└────┬────┘  └──────────┘  └────┬─────┘
     │                          │
     ▼                          ▼
┌─────────┐              ┌──────────┐
│ MySQL   │              │ Workers  │
│ (Data)  │              │ (Email)  │
└─────────┘              └────┬─────┘
                              │
                              ▼
                        ┌──────────┐
                        │  Brevo   │
                        │ (Email)  │
                        └──────────┘
```

## Module Responsibilities

### Authentication (`auth/`)
- OTP generation and verification
- JWT access/refresh token management
- Refresh token rotation with reuse detection
- Passport JWT strategy

### Products (`products/`)
- Product CRUD with soft delete
- Image upload and processing (Sharp → WebP)
- Category filtering
- Search with pagination

### Cart (`cart/`)
- Add/update/remove items
- Stock validation per size
- Duplicate item handling

### Checkout (`checkout/`)
- Buy-now and cart checkout flows
- Stock validation
- Order creation with inventory decrement

### Payments (`payments/`)
- Razorpay order creation
- Payment signature verification
- Webhook processing (payment.captured, payment.failed)
- COD payment handling
- Retry failed payments

### Orders (`orders/`)
- Order listing with filters
- Status management with transition rules
- Status history tracking
- Order cancellation

### Inventory (`inventory/`)
- Per-size stock tracking
- Atomic stock decrement (Prisma transactions)
- Seller ownership validation

### Notifications (`notifications/`)
- BullMQ email queue (Brevo)
- In-app notification queue
- Email templates for 14 event types

### Pricing (`pricing/`)
- Price calculation pipeline
- Coupon discount application
- Shipping and tax calculation

### Coupons (`coupons/`)
- Percentage and fixed-amount coupons
- Usage limits (global and per-user)
- Expiry validation
- Apply/release/consume lifecycle

### Returns/Refunds (`returns/`, `refunds/`)
- Return request management
- Refund processing via Razorpay
- Status tracking

### Audit (`audit/`)
- Action logging for sensitive operations
- Entity-level audit trail

## Data Flow

### Customer Order Flow

```
1. Browse → GET /products
2. Product Detail → GET /products/:id
3. Add to Cart → POST /cart
4. Checkout → POST /checkout/buynow or /checkout/cartbuynow
5. Payment → POST /payments/checkout → Razorpay SDK
6. Verify → POST /payments/verify → Signature check
7. Order Created → Orders table + Stock decremented
8. Email Sent → BullMQ → Brevo
9. Notification → BullMQ → In-app notification
```

### Seller Flow

```
1. Login → POST /sellers/login
2. Dashboard → GET /sellers/dashboard
3. Manage Products → CRUD /sellers/products
4. Update Stock → PUT /inventory/:productId
5. View Orders → GET /seller/orders
6. Update Status → PATCH /seller/orders/:id/status
```

### Admin Flow

```
1. Login → POST /auth/verify-otp (admin role)
2. Dashboard → GET /admin/dashboard
3. Manage Users → GET/PUT /admin/users
4. Manage Sellers → GET/PUT /admin/sellers
5. Manage Orders → GET/PATCH /admin/orders
6. Manage Coupons → CRUD /coupons/admin
7. View Audit Logs → GET /admin/audit-logs
```

## Key Design Decisions

1. **Monorepo**: Shared types and validation between API and Web
2. **Prisma**: Type-safe database access with MySQL
3. **BullMQ**: Async email/notification processing
4. **Redis**: OTP storage, rate limiting, caching (with in-memory fallback)
5. **Soft Delete**: Products use `deletedAt` instead of hard delete
6. **Optimistic Locking**: Stock decrement via Prisma transactions
7. **Refresh Token Rotation**: Old tokens revoked on each refresh
8. **Webhook Verification**: Razorpay webhooks verified with HMAC signature

---

# Phase 17 — Advanced Capabilities (2026-08-28)

## New modules

- `alerts/` — back-in-stock & price-drop alerts (create/cancel/list; scheduler-driven idempotent emails via `alert-scheduler.service.ts`).
- `support/` — support ticket engine: sequential `BQ-TKT-xxxxx` numbering, ordered orders ownership validation, internal-vs-public message thread, admin console; emails via Notifications queue.
- `scheduled/` — `ScheduledJobsModule`: abandoned-cart reminders (24–72h idle, promotional consent, in-stock guard, 7-day cooldown) and coupon auto-expiry. Every `@Cron` body runs under `RedisService.withLock` so `main.ts` and `worker.ts` can both boot safely.
- `admin/admin-exports.*` — streaming CSV exports (orders/products/customers/refunds/sales) through the existing `AuditService` (`ADMIN_EXPORT`).
- `notifications/preferences.service.ts` — per-user notification preferences gating transactional/ marketing emails (promotional consent gates abandoned carts).

## Design decisions (Phase 17)

1. **Cron safety on dual boot**: distributed Redis lock (`withLock`) wraps every scheduled job; lock name = job id, TTL covers the run. In-memory fallback when Redis is down (single-process guarantee only — documented limitation).
2. **Deterministic email eventIds** (`back-in-stock:{id}`, `price-drop:{id}`, `cart-reminder:{id}`, `support-ticket:{ticketId}:{type}`) make repeated enqueues idempotent inside the BullMQ dedupe window.
3. **Search ranking**: relevance `CASE` score then rank/popularity; explicit `sort` (price/newest) always keeps rank as final tiebreaker.
4. **FBT computed from real order history** (ordered-line aggregate), never fabricated co-purchase data.
5. **Support threading**: internal admin notes are filtered at the query layer for customer views; status transitions (OPEN→IN_PROGRESS→RESOLVED/CLOSED) each trigger the correct email event.
6. **Exports stream in batches** (`paginate(500)`) with UTF-8 BOM so oversized datasets never load fully into memory.
7. **No new infrastructure** — reuses existing MySQL, Redis locks, BullMQ queues, and the shared `AppModule` (Constraint §78/81).
