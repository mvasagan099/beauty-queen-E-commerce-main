# Payment System — Phase 6 Audit-Fix

**Last updated:** 2026-08-27
**Scope:** Security & correctness migration and hardening of the Razorpay payment flow.

---

## Money & Status Model

- The backend is the **single source of truth** for amounts and statuses.
  - Prices are looked up from the database at checkout time; the frontend
    never sends prices.
  - `Payment.amount` is stored in **paise** (`Int`), always `INR`.
  - `Payment.status` uses the database `RazorpayPaymentStatus` enum:
    `PENDING | AUTHORIZED | CAPTURED | FAILED | REFUNDED | PARTIALLY_REFUNDED`.
    Raw status strings are centralised in
    `apps/api/src/payments/types/payment-status.ts` (`PAYMENT_STATUS`,
    `PAYMENT_METHOD`, `REFUND_STATUS`, `RAZORPAY_STATUS_TO_INTERNAL`).
- `Order.status` (fulfilment) and `Order.paymentStatus` (money) are kept
  **separate by design** — a single check-out creates one `Payment` and one
  `Order` per line item, all linked by `checkoutId` (a `uuid`).

## Endpoints (`POST /api/payments` unless noted)

| Method + Path | Auth | Purpose |
|---|---|---|
| `POST /checkout` | user | Validates cart/buy-now, calculates pricing server-side, creates orders + payment (stock reserved), optionally creates a Razorpay order for UPI |
| `POST /create-order` | user | Idempotently creates/reuses the Razorpay order for a checkout (amount always from backend) |
| `POST /verify` | user | Verifies the Razorpay signature AND cross-checks the provider payment record (`fetchPayment`) before confirming orders |
| `POST /cod/confirm` | user | Confirms a COD checkout (order lifecycle start + notifications) |
| `POST /retry` | user | Re-opens a payment attempt for a failed/abandoned checkout by `checkoutId`, bumps `metadata.attempts` |
| `GET /:id/status` | user | Status of a payment by internal id (ownership enforced) |
| `GET /checkout/:checkoutId/status` | user | Status of a payment by checkout id (ownership enforced) — used by the payment pages |
| `POST /:paymentId/refund` | **admin** | Full/partial refund of a captured payment; updates payment to `REFUNDED`/`PARTIALLY_REFUNDED` |
| `POST /webhook` | Razorpay | Signature-verified webhook ingestion (`payment.captured/failed/authorized`, `refund.processed/created/failed`) |

All user-facing money endpoints carry a Redis-backed rate limit
(`RateLimitGuard`) including the create/verify/retry/refund paths.

## Security

- **Signature verification** (`razorpay.service.ts`):
  - Payment verification uses HMAC-SHA256 over `orderId|paymentId` and the key
    secret, compared with `crypto.timingSafeEqual`.
  - Webhook verification uses a dedicated `RAZORPAY_WEBHOOK_SECRET` when set,
    otherwise falls back to the key secret (logged warning in production).
- **Provider cross-check** (`payments.service.ts` → `verifyPayment`):
  - After signature check, `razorpay.payments.fetch(paymentId)` is called and
    the provider's `amount`, `currency`, `order_id` and `status`
    (`captured`/`authorized`) must match the authoritative backend record.
  - On mismatch the payment is marked `FAILED` with reason
    `Payment verification failed: amount/status mismatch` and the order is
    **not** confirmed (alerted via server logs; reconciliation item below).
- **Webhook hardening**: a missing `x-razorpay-signature` or missing raw body
  now returns **HTTP 400** (previously `200 { success:false }`).
- **Ownership** (`assertPaymentOwnership`): every user-facing lookup verifies
  `payment.userId` (or the falling-back order `userId`) matches `req.user.sub`;
  `roles.guard` + `Role.ADMIN` guard the refund endpoint.
- **Distributed locking** (`RedisService.setNx`): concurrent verify/webhook
  processing of the same payment is serialised via Redis keys
  `pay:verify-lock:<paymentId>` / `pay:webhook-lock:<eventKey>`. Redis is only a
  coordination layer; the database remains the source of truth (an in-memory
  fallback keeps the app functional when Redis is down).
- Payment pages (`/payment/success`) are **only reached after the backend has
  confirmed the payment** via `verify`; the page then reads the authoritative
  status via `GET checkout/:checkoutId/status` and polls while `PENDING`.

## Webhooks & Idempotency

- Raw events are persisted to `payment_webhook_events` with a unique
  `providerEventId` derived as `<eventType>:<entityId>` (e.g.
  `payment.captured:pay_xxx`), so every event is stored and processed **at most
  once**.
- Event processing order: unique-check → Redis lock → re-check → upsert
  (unprocessed) → apply → mark `processed` + `processedAt`.
- Handled events:
  - `payment.captured` → confirm orders (only non-`Completed`), cross-check
    amount/currency first, queue `PAYMENT_SUCCESS` emails/notifications.
  - `payment.failed` → mark payment `FAILED`, release any coupon, queue
    `PAYMENT_FAILED`.
  - `payment.authorized` → move `PENDING → AUTHORIZED` (orders untouched).
  - `refund.processed` / `refund.created` → mark refund `COMPLETED`, recompute
    payment status (`REFUNDED` vs `PARTIALLY_REFUNDED`), notify.
  - `refund.failed` → mark refund `FAILED`.
- Unknown events are acknowledged (200) but persisted as unprocessed for later
  reconciliation.

## Notifications

`payments.service` and `webhook.service` use `NotificationsService`
(BullMQ + Brevo):

- `notifyPaymentSuccess` → `PAYMENT_SUCCESS` email + in-app `PAYMENT_UPDATE`.
- `notifyPaymentFailed` → `PAYMENT_FAILED` email.
- `notifyOrderCreated` (COD) → `ORDER_CREATED` email + in-app.
- `notifyRefundInitiated` / `notifyRefundCompleted` → refund lifecycle emails.

## Database

New migration: `prisma/migrations/20260827_phase6_payments/migration.sql`.

- `payments.user_id` (`Int?`, indexed), `user` relation.
- `payments.method` (`VarChar(50)`), `payments.metadata` (`Json?`).
- New table `payment_webhook_events`
  (`provider_event_id` unique, `event_type`, `payment_id`, `order_id_ref`,
  `processed`, `processed_at`, `payload` JSON, `created_at` — indexed on
  `processed` + `created_at`).

## Running the migration

```bash
cd apps/api
npx prisma migrate dev --name phase6_payments --schema=../../prisma/schema.prisma
# or apply the hand-written migration.sql against the DB
npx prisma generate --schema=../../prisma/schema.prisma
```

## Tests

- `apps/api/src/payments/razorpay.service.spec.ts` — signature/anti-tamper.
- `apps/api/src/payments/webhook.service.spec.ts` — idempotency, capture
  amount-mismatch guard, failure coupon release.

Run with `cd apps/api && npx jest src/payments`.

## Still open (documented elsewhere)

- Automated reconciliation/alerting for provider amount/currency mismatches
  (currently logged + payment marked failed).
- Stock release for abandoned/failed-payment checkouts (stock is reserved at
  checkout creation; see `MISSING-FEATURES.md`).
- Invoices/GST reporting and payment analytics dashboards.
- Generic throttling for non-payment endpoints.