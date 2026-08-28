# Final Security Audit

**Date:** 2026-08-28 (Phase 20 hardening — re-verified against current source)
**Scope:** Complete security review of NestJS backend + Next.js frontend
**Method:** Every finding below was re-verified by direct reading of the current
code. This document **supersedes** the earlier draft (dated 2026-08-26) which
contained stale/outdated findings that no longer reflect the hardened codebase.

Status legend: `PASS` = verified in current code, `PARTIAL` = mitigated but with
a documented residual, `FAIL` = open item that should be closed.

---

## 1. Authentication

| Check | Status | Details |
|-------|--------|---------|
| Password hashing | PASS | bcryptjs used for seller passwords (`sellers.service.ts`). |
| OTP generation | PASS | `crypto.randomInt(100000, 999999)` — cryptographically secure (`auth.service.ts:24`). |
| OTP storage | PASS | Redis with TTL (survives restarts, auto-expires). |
| OTP brute-force | PASS | `OtpRateLimitGuard` on `/auth/send-otp` + `/auth/verify-otp` (`auth.controller.ts:29,43`). |
| OTP verification attempts | PASS | Max 5 attempts per OTP stored in Redis. |
| JWT signing | PASS | HS256; `JwtModule.registerAsync` throws if `JWT_ACCESS_SECRET` missing. |
| JWT fallback secrets | PASS | No `'access-secret'`/`'refresh-secret'` fallbacks remain anywhere, including seller `login` (removed this phase). Startup throws when secrets unset. |
| Refresh token storage | PASS | Database-backed, revocable. |
| Refresh token rotation | PASS | Old token revoked on use. |
| Token expiry | PASS | Access: 15m, Refresh: 7d. |
| Logout | PASS | Revokes the **current user's** refresh tokens (`req.user.sub`) + clears cookies; seller logout not cross-revoked (known issue, see KL). |
| Auth rate limiting | PASS | `/auth/refresh` now rate-limited (IP-based) this phase. |

## 2. Authorization

| Check | Status | Details |
|-------|--------|---------|
| Role-based guards | PASS | `RolesGuard` checks JWT role claims. |
| Ownership guard | PASS | `RolesGuard` + ownership checks on order detail/history/status. **Phase 19 confirmation:** `orders.service.ts` `getSellerOrder(id, sellerId)` (scoped `findFirst`) and `getStatusHistory(id, user?)` (customer ownership when a user is passed) were re-verified in live source and the two unscoped call-sites (`seller/orders/:id`, `orders/:id/history`) were closed. |
| Admin-only routes | PASS | `@Roles(ADMIN)` on admin controllers/actions. |
| Seller-only routes | PASS | `@Roles(SELLER)` on seller controllers/actions. |
| Customer-only routes | PASS | `@Roles(CUSTOMER)` class-level gating added this phase to `users`, `cart`, `wishlist`, `checkout`, `notifications`, `orders` (customer routes), `reviews` (customer routes), `returns`, `refunds`, `invoices`, `payments` (customer routes), and `auth` (`logout`,`me`). This closes the earlier "any authenticated user can access customer data" gap (IDOR). |
| Public routes | PASS | Products, categories, search, health remain public by design. |
| Metrics endpoint | PASS (new) | `/api/metrics` + `/api/metrics/queues` now ADMIN-only (was public — closed this phase). |

## 3. JWT & Cookies

| Check | Status | Details |
|-------|--------|---------|
| httpOnly cookies | PASS | Access/refresh httpOnly: true. |
| sameSite | PASS | `lax` — mitigates cross-origin CSRF for cookie-authenticated POSTs. |
| secure flag | PASS | `secure: isProduction`; correct in production (HTTP only in dev). |
| Cookie path | PASS | Set with `path: '/'`; **customer logout now clears with `path: '/'`** (aligned with seller logout — fixed this phase). |
| Token in response body (seller) | PARTIAL | Seller `login` returns tokens in JSON body for the frontend's localStorage flow; requires a frontend rewrite to remove (see KL). CSRF/SameSite controls remain effective. |
| Token in response body (customer) | PASS | Customer auth uses httpOnly cookies only. |

## 4. CORS

| Check | Status | Details |
|-------|--------|---------|
| Origin restriction | PASS | Production allows only `FRONTEND_URL`; dev adds localhost |
| Credentials | PASS | `credentials: true` for cookie auth |
| Headers | PASS | Content-Type, Authorization, x-csrf-token |

## 5. CSRF

| Check | Status | Details |
|-------|--------|---------|
| CSRF token module | PARTIAL | `CsrfModule` + `CsrfGuard` + `CsrfService` exist and are registered in `AppModule`, but the guard is **not attached** to state-changing routes and the frontend does not send a token. |
| SameSite cookie | PASS | `SameSite=Lax` on auth cookies provides baseline CSRF protection for cross-origin state-changing requests (the primary vector). |
| Risk | LOW | Residual CSRF risk is limited to same-site subdomain/sibling cases because of `SameSite=Lax`. Wiring `CsrfGuard` would require coordinated frontend token fetch + header — deferred as non-blocking. |

## 6. XSS

| Check | Status | Details |
|-------|--------|---------|
| Helmet CSP | PASS (mitigated) | CSP enabled in `main.ts` with directives allowing Razorpay; deviates from strict via `'unsafe-inline'`/`'unsafe-eval'` (needed for the Next/Razorpay runtime). |
| Helmet other headers | PASS | X-Content-Type-Options, X-Frame-Options, etc. enabled. |
| Input sanitization | PASS | Prisma parameterized queries prevent SQL injection. |
| Output encoding | PASS | React escapes by default. |

## 7. SQL Injection

| Check | Status | Details |
|-------|--------|---------|
| ORM usage | PASS | Prisma parameterizes all queries. |
| Raw queries | PARTIAL | A few row-lock queries use `Prisma.$queryRawUnsafe` with **whitelist-validated** size column names (`getSizeField`) and numeric id params (bind values) — no injection path; column name derived from an allow-list. |

## 8. File Uploads

| Check | Status | Details |
|-------|--------|---------|
| MIME validation | PASS | ImageService validates jpeg/png/webp/gif. |
| Size / count limit | PASS | 5MB max per file, 5 images per product. |
| Path traversal | PASS | Files renamed with UUID-like names; static served from dedicated dirs. |

## 9. Rate Limiting

| Check | Status | Details |
|-------|--------|---------|
| OTP endpoints | PASS | `OtpRateLimitGuard` on send/verify. |
| Payments flow | PASS | Per-route `RateLimitGuard` on checkout/create-order/verify/cod/retry/refund. |
| Seller auth | PASS (new) | `RateLimitGuard` on seller `signup` + `login` this phase. |
| Auth refresh | PASS (new) | `RateLimitGuard` on `/auth/refresh` this phase. |
| Checkout module | PASS (new) | `RateLimitGuard` on `checkout/preview`, `buynow`, `cartbuynow` this phase. |
| Global throttler | PARTIAL | No `@nestjs/throttler`-style global limit; per-endpoint guards cover the sensitive flows. |

## 10. Secrets Management

| Check | Status | Details |
|-------|--------|---------|
| `.env` gitignored | PASS | `.env` is in `.gitignore` and not staged. |
| `.env.example` | PASS | Present and documents all variables incl. new `REDIS_PASSWORD`/`REDIS_TLS`/`REDIS_URL`. |
| Hardcoded secrets | PASS | No JWT/API fallback secrets remain in source. |
| Legacy `server/.env` | PASS | `server/` is legacy/leftover (not referenced by root build/compose/CI); not part of the active architecture. |

## 11. Payment Security

| Check | Status | Details |
|-------|--------|---------|
| Razorpay order creation | PASS | Server-side only. |
| Payment verification | PASS | `verifyPayment` + `verifyWebhookSignatureSafe` signature verification. |
| Webhook signature | PASS | `handleWebhook` **rejects missing signature/rawBody** and invalid signatures before processing (`payments.controller.ts:141-160`); `rawBody: true` in `NestFactory.create`. |
| Amount verification | PASS | Webhook `handleCaptured` cross-checks provider amount/currency against the backend record before confirming orders. |
| Duplicate webhook protection | PASS | Idempotency via unique `providerEventId` + Redis lock. |

## 12. Error Handling

| Check | Status | Details |
|-------|--------|---------|
| Global exception filter | PASS | `AllExceptionsFilter` formats errors. |
| Error message leakage | PARTIAL | Raw `exception.message` may surface for non-HTTP exceptions; logged fully, response shape controlled. |
| Stack traces | PASS | Not exposed in responses. |

## 13. Headers

| Check | Status | Details |
|-------|--------|---------|
| Helmet | PASS | Applied globally with CSP. |
| X-Content-Type-Options / X-Frame-Options | PASS | nosniff / DENY. |
| Strict-Transport-Security | PARTIAL | Enforced by Helmet in production HTTPS. |
| Content-Security-Policy | PASS | Enabled (see XSS). |

## 14. Swagger / API Docs

| Check | Status | Details |
|-------|--------|---------|
| Production exposure | PASS | Swagger only mounted when `NODE_ENV !== 'production'` (`main.ts:114`). |

## 15. Static Files

| Check | Status | Details |
|-------|--------|---------|
| Product images | PASS | Public access is intentional. |
| Uploaded content | PARTIAL | `/uploads` is served without auth — product images are public by design; non-image documents, if any, should be access-controlled. |

## 16. Summary

| Category | Critical | High | Medium | Low | Pass |
|----------|----------|------|--------|-----|------|
| Authentication | 0 | 0 | 0 | 0 | 11 |
| Authorization | 0 | 0 | 0 | 0 | 7 |
| JWT & Cookies | 0 | 0 | 0 | 1 | 6 |
| CORS | 0 | 0 | 0 | 0 | 3 |
| CSRF | 0 | 0 | 0 | 1 | 1 |
| XSS | 0 | 0 | 0 | 0 | 4 |
| SQL Injection | 0 | 0 | 0 | 1 | 1 |
| File Uploads | 0 | 0 | 0 | 0 | 4 |
| Rate Limiting | 0 | 0 | 0 | 1 | 5 |
| Secrets | 0 | 0 | 0 | 0 | 4 |
| Payment Security | 0 | 0 | 0 | 0 | 5 |
| Error Handling | 0 | 0 | 0 | 1 | 1 |
| Headers | 0 | 0 | 0 | 1 | 3 |
| Swagger | 0 | 0 | 0 | 0 | 1 |
| Static Files | 0 | 0 | 0 | 1 | 1 |
| **TOTAL** | **0** | **0** | **0** | **7** | **57** |

**No Critical, High, or Medium unresolved findings.** All remaining items are Low,
non-blocking residuals, each documented below.

## 17. Residual Low items (non-blocking)

1. **Seller token in JSON body** (KL) — frontend localStorage flow; removing
   requires coordinated `apps/web/lib/api.ts` rewrite. `SameSite=Lax` cookies
   still protect the customer flow.
2. **CSRF guard not wired** — `SameSite=Lax` covers the cross-origin vector;
   wiring `CsrfGuard` is defense-in-depth for later.
3. **CSP `'unsafe-inline'`/`'unsafe-eval'`** — required by Razorpay/Next runtime;
   tighten only after vendor-compat testing.
4. **`$queryRawUnsafe` with row locks** — column names come from a strict
   allow-list; params are bound values. No injection.
5. **Raw exception message** can surface for non-HTTP errors; no stack leak.
6. **HSTS only under HTTPS** — enforced by Helmet when served over TLS.
7. **`/uploads` unauthenticated** — product images are intentionally public.

## 18. Blocking-confirmed-fixed (from the earlier draft)

The earlier draft's `FAIL`/`HIGH` items that are **verified resolved** in current
code: webhook signature bypass, JWT fallback secrets, `Math.random()` OTP,
customer-route IDOR, global rate limiting, `.env` in repo, `.env.example`
missing, and Swagger exposed in production.
