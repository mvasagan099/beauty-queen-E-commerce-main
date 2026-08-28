# Regression Matrix

**Date:** 2026-08-26
**Scope:** Test coverage matrix for all features after Phase 14

---

## Legend

| Status | Meaning |
|--------|---------|
| PASS | Feature verified working |
| FAIL | Feature verified broken |
| BLOCKED | Cannot test (depends on fix) |
| N/A | Not applicable |

---

## 1. Authentication

| Test Case | Status | Notes |
|-----------|--------|-------|
| OTP login flow (email → send → verify → home) | PASS | Works end-to-end |
| OTP expiry (5 minutes) | PASS | Redis TTL enforced |
| OTP max attempts (5) | PASS | Redis counter enforced |
| Logout (clear tokens) | PASS | Refresh token revoked |
| JWT access token generation | PASS | |
| JWT refresh token rotation | PASS | Old token revoked on use |
| Refresh token expiry (7 days) | PASS | |
| Cookie httpOnly flag | PASS | |
| Cookie sameSite=lax | PASS | |
| **OTP uses Math.random()** | **FAIL** | **P0-4: Not cryptographically secure** |
| **JWT fallback secrets** | **FAIL** | **P0-3: Falls back to guessable defaults** |
| **Rate limiting on OTP** | **FAIL** | **P0-2: No rate limiting** |
| **Seller tokens in response body** | **FAIL** | **P1: Tokens in JSON body, not cookies** |

## 2. Authorization

| Test Case | Status | Notes |
|-----------|--------|-------|
| Customer → public pages | PASS | |
| Customer → cart/checkout/account | PASS | |
| Customer → seller pages | DENY | |
| Customer → admin pages | DENY | |
| Seller → own products | PASS | OwnershipGuard |
| Seller → other seller's products | DENY | OwnershipGuard |
| Seller → admin pages | DENY | RolesGuard |
| Admin → all resources | PASS | |
| Admin → seller resources | DENY | RolesGuard |
| Unauthenticated → public pages | PASS | |
| Unauthenticated → protected pages | REDIRECT | |
| **Unauthenticated → /seller/dashboard** | **FAIL** | **P1-4: No middleware** |
| **Unauthenticated → /admin/dashboard** | **FAIL** | **P1-4: No middleware** |

## 3. Products

| Test Case | Status | Notes |
|-----------|--------|-------|
| List products (paginated) | PASS | |
| Filter by category | PASS | |
| Sort by price | PASS | |
| Search products | PASS | |
| Get single product | PASS | |
| Get homepage data (8 sections) | PASS | |
| Create product (seller) | PASS | |
| Update product (seller, own) | PASS | |
| Delete product (soft delete) | PASS | |
| Restore product | PASS | |
| Product images (5 max) | PASS | |
| Image validation (MIME, size) | PASS | |
| Product not found (404) | PASS | |

## 4. Cart

| Test Case | Status | Notes |
|-----------|--------|-------|
| Add to cart (authenticated) | PASS | |
| Add to cart (unauthenticated) | DENIED | Expected — server-side cart requires auth |
| Update quantity | PASS | |
| Remove item | PASS | |
| Clear cart | PASS | |
| Stock validation on add | PASS | |
| Duplicate item (quantity increment) | PASS | |
| Buy Now mode | PASS | |
| Cart mode | PASS | |
| Cart persists across sessions | PASS | |

## 5. Checkout & Payment

| Test Case | Status | Notes |
|-----------|--------|-------|
| Checkout with address | PASS | |
| Checkout with COD | PASS | |
| Checkout with Razorpay UPI | PASS | |
| Payment success page | **FAIL** | **P1-1: getStatus(0) always passes 0** |
| Payment failure page | **FAIL** | **P1-2: retry(0) always passes 0** |
| Payment retry | **FAIL** | **BLOCKED by P1-2** |
| Razorpay order creation | PASS | |
| Payment signature verification | PASS | |
| **Webhook signature verification** | **FAIL** | **P0-1: Bypassed when missing** |
| Duplicate webhook handling | PARTIAL | Status check exists but race condition possible |
| COD confirmation | PASS | |

## 6. Orders

| Test Case | Status | Notes |
|-----------|--------|-------|
| Create order (single item) | PASS | |
| Create order (cart) | PASS | |
| Order list (customer) | PASS | |
| Order detail (customer) | PASS | |
| Order status history | PASS | |
| Cancel order (customer) | PASS | |
| Update order status (admin) | PASS | |
| Update order status (seller) | PASS | |
| Delete order (admin) | PASS | |
| Order with correct pricing | PASS | Server recalculates |
| Stock decrement on order | PASS | |

## 7. Inventory

| Test Case | Status | Notes |
|-----------|--------|-------|
| Per-size stock tracking | PASS | |
| Stock never negative | PASS | |
| Out-of-stock detection | PASS | |
| Manual stock update (seller) | PASS | |
| Stock check on add to cart | PASS | |
| Stock check on checkout | PASS | |

## 8. Seller

| Test Case | Status | Notes |
|-----------|--------|-------|
| Seller signup | PASS | |
| Seller login | PASS | |
| Seller dashboard | PASS | |
| Seller product list | **FAIL** | **P1-3: Hardcoded localhost URLs** |
| Seller add product | PASS | |
| Seller edit product | PASS | |
| Seller delete product | **FAIL** | **P1-3: Hardcoded localhost URL** |
| Seller restore product | **FAIL** | **P1-3: Hardcoded localhost URL** |
| Seller order list | PASS | |
| Seller update order status | PASS | |
| Seller profile update | PASS | |
| Ownership enforcement | PASS | |

## 9. Admin

| Test Case | Status | Notes |
|-----------|--------|-------|
| Admin dashboard | PASS | |
| Admin product list | PASS | |
| Admin order list | **FAIL** | **P1-3: Hardcoded localhost URL for status update** |
| Admin order detail | PASS | |
| Admin update order status | PASS | |
| Admin delete order | PASS | |
| Admin user list | PASS | |
| Admin user role change | PASS | |
| Admin seller list | PASS | |
| Admin seller status toggle | PASS | |
| **Admin auth protection** | **FAIL** | **P1-4: No middleware** |

## 10. Reviews

| Test Case | Status | Notes |
|-----------|--------|-------|
| Get reviews for product | PASS | |
| Create review (authenticated) | PASS | |
| Update own review | PASS | |
| Delete own review | PASS | |
| Admin moderate review | PASS | |
| Can-review check (verified purchase) | PASS | |

## 11. Wishlist

| Test Case | Status | Notes |
|-----------|--------|-------|
| Get wishlist | PASS | |
| Toggle wishlist item | PASS | |
| Clear wishlist | PASS | |
| Duplicate prevention | PASS | |

## 12. Coupons

| Test Case | Status | Notes |
|-----------|--------|-------|
| Validate coupon (backend) | PASS | |
| Apply coupon (backend) | PASS | |
| **Apply coupon (frontend)** | **BLOCKED** | **P2-4: No frontend UI** |

## 13. Notifications

| Test Case | Status | Notes |
|-----------|--------|-------|
| Email OTP via Brevo | PASS | |
| Email order notification queue | PASS | BullMQ processor exists |
| In-app notifications | PARTIAL | Model exists, limited UI |

## 14. SEO

| Test Case | Status | Notes |
|-----------|--------|-------|
| Page metadata (title, description) | PASS | |
| Open Graph tags | PASS | |
| Sitemap.xml | PASS | |
| Robots.txt | PASS | |
| **Canonical URLs** | **BLOCKED** | **P2-6: Not implemented** |
| **JSON-LD structured data** | **BLOCKED** | **P2-7: Not implemented** |
| Private pages not indexed | PARTIAL | No noindex on account pages |

## 15. Security

| Test Case | Status | Notes |
|-----------|--------|-------|
| Password hashing (bcryptjs) | PASS | |
| JWT signed with secret | PASS | |
| httpOnly cookies | PASS | |
| CORS configured | PASS | |
| Helmet headers | PASS | |
| Prisma SQL injection prevention | PASS | |
| File upload validation | PASS | |
| **Rate limiting** | **FAIL** | **P0-2: Not configured** |
| **CSRF protection** | **FAIL** | **P1: Not implemented** |
| **CSP headers** | **FAIL** | **P1: Disabled** |
| **Webhook signature** | **FAIL** | **P0-1: Bypassed** |
| **Swagger in production** | **FAIL** | **P1-6: Always enabled** |

## 16. Performance

| Test Case | Status | Notes |
|-----------|--------|-------|
| Homepage loads within 3s | PASS | 9 queries parallel |
| Category page pagination | PASS | |
| Product search response | PASS | |
| **List endpoints pagination** | **FAIL** | **P2-2: Unbounded results** |
| **N+1 query in checkout** | **FAIL** | **P2-3: Product lookup per item** |
| **Missing DB indexes** | **FAIL** | **P2-1: Full table scans** |

## 17. Mobile

| Test Case | Status | Notes |
|-----------|--------|-------|
| Homepage responsive | PASS | |
| Product grid responsive | PASS | |
| Product detail responsive | PASS | |
| Cart responsive | PASS | |
| Checkout responsive | PASS | |
| Admin responsive | PASS | |
| Seller responsive | PASS | |
| Navbar mobile menu | PASS | |

---

## Summary

| Category | PASS | FAIL | BLOCKED | N/A | Total |
|----------|------|------|---------|-----|-------|
| Authentication | 10 | 3 | 0 | 0 | 13 |
| Authorization | 10 | 2 | 0 | 0 | 12 |
| Products | 13 | 0 | 0 | 0 | 13 |
| Cart | 9 | 0 | 0 | 0 | 9 |
| Checkout & Payment | 6 | 3 | 1 | 0 | 10 |
| Orders | 10 | 0 | 0 | 0 | 10 |
| Inventory | 6 | 0 | 0 | 0 | 6 |
| Seller | 8 | 3 | 0 | 0 | 11 |
| Admin | 8 | 2 | 0 | 0 | 10 |
| Reviews | 6 | 0 | 0 | 0 | 6 |
| Wishlist | 4 | 0 | 0 | 0 | 4 |
| Coupons | 2 | 0 | 1 | 0 | 3 |
| Notifications | 2 | 0 | 0 | 1 | 3 |
| SEO | 4 | 0 | 2 | 0 | 6 |
| Security | 7 | 5 | 0 | 0 | 12 |
| Performance | 3 | 3 | 0 | 0 | 6 |
| Mobile | 8 | 0 | 0 | 0 | 8 |
| **TOTAL** | **116** | **21** | **4** | **1** | **142** |

**Pass rate:** 81.7%
**Fail rate:** 14.8%
**Blocked rate:** 2.8%

---

## Critical Path Failures

These failures block core user flows:

1. **Payment success page** (P1-1) — Customers cannot see payment confirmation
2. **Payment retry** (P1-2) — Customers cannot retry failed payments
3. **Seller product management** (P1-3) — Sellers cannot delete/restore products
4. **Admin order status** (P1-3) — Admins cannot update order status from list view
5. **Webhook signature** (P0-1) — Payment webhooks can be spoofed
6. **Rate limiting** (P0-2) — OTP endpoint can be abused
7. **JWT fallback secrets** (P0-3) — Tokens signed with guessable secrets if env missing
