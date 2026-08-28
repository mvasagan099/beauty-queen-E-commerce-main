# Database Index Review & N+1 Query Audit

Phase 11 hardening deliverable. Reviewed against the actual Prisma query
patterns in `apps/api/src/**` (not guessed indexes).

## 1. Index review

### Existing indexes (already in schema)

| Table | Indexes | Justification |
|-------|---------|---------------|
| `products` | `seller_id`, `ptype`, `price`, `deleted_at`, `created_at` | Seller products, category/filter pages, stock filtering, new arrivals |
| `orders` | `email`, `status`, `product_id`, `checkout_id`, `user_id`, `seller_id` | Customer orders, status filters, checkout join, seller orders, analytics |
| `order_status_history` | `order_id` | Status timeline per order |
| `refresh_tokens` | `token` (unique), `user_id` | Refresh lookup + rotation |
| `cart_items` | `(user_id, product_id, size)` (unique) | Cart upsert key |
| `addresses` | `user_id` | Per-user address list |
| `reviews` | `(user_id, product_id)` (unique), `product_id`, `status` | One review per product; product reviews; moderation |
| `wishlist_items` | `(user_id, product_id)` (unique), `product_id` | Toggle lookups; product popularity |
| `coupons` | `code` (unique) | Code redemption |
| `coupon_usages` | `coupon_id`, `user_id` | Usage limits & per-user caps |
| `payments` | `checkout_id`, `user_id`, `provider_order_id` (unique), `provider_payment_id` (unique) | Checkout join, webhook lookups, idempotency |
| `payment_webhook_events` | `provider_event_id` (unique), `processed`, `created_at`, `payment_id` | Idempotent webhook handling |
| `invoices` | `invoice_number` (unique), `order_id`, `user_id` | Invoice retrieval |
| `audit_logs` | `(entity_type, entity_id)`, `actor_id`, `created_at` | Admin audit trail + filters |
| `return_requests` | `order_id`, `user_id`, `status` | Returns list/filters |
| `refunds` | `checkout_id`, `user_id`, `status`, `return_request_id` | Refund tracking & return-request join |
| `notifications` | `user_id`, `(user_id, read_at)`, `created_at` | Inbox + unread count + feed |
| `sellers` | `email`, `mobile` | Login/auth lookups (added in Phase 11) |

### Indexes added in Phase 11 (migration
`prisma/migrations/20260828_phase11_prod_hardening`)

- `seller(email)`, `seller(mobile)` — seller login/lookup and uniqueness
  checks run `findFirst { OR: [{email}, {mobile}] }` on every login/signup.
- `orders(order_date)` — seller and admin dashboards order by `orderDate desc`.
- `refunds(return_request_id)` — refunds are joined/filtered by return request.
- `payment_webhook_events(payment_id)` — webhook processing looks payments up by
  provider payment id.

All are non-unique, additive indexes safe to apply to existing data.

### Not indexed (deliberately)

- `product.name` / description full-text search — handled via `contains`
  filters with bounded result sets; add Fulltext/trigram indexes only if a
  real query-pattern measurement justifies it (per the "measure before
  optimizing" rule).

## 2. N+1 query audit

Reviewed services for N+1 (querying a child row per parent row in a loop).

- **Orders / seller orders**: order lists include `product` via a single
  Prisma `include`, not per-row lookups. Seller order detail includes product +
  statusHistory in one query. No N+1.
- **Products with seller/category**: product queries use `findMany` with
  included relations where needed. No per-product seller round-trips observed.
- **Cart/checkout**: cart items include product via relation include.
- **Recommendations/results**: `getSimilarProducts` uses `take`-bounded queries
  and falls back to fillers; no per-row fetch.
- **Admin analytics**: aggregates run in `Promise.all` (bounded, parallel), not
  nested loops.

### Guidance

- Prefer Prisma `include`/`select` to fetch related rows with the parent query.
- For large listings, always paginate (`page`/`limit`) and use `select` to
  project only required fields—never return full rows from unbounded lists.
- Re-check after any new nested `for` loop that calls
  `this.prisma.<model>.find...` inside it.
