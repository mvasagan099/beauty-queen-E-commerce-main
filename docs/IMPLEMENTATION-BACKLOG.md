# Implementation Backlog

**Date:** 2026-08-26
**Scope:** Every missing/broken feature with full implementation specification

---

# P0 — Critical

---

## P0-1: Webhook Signature Verification

**Feature:** Razorpay webhook must verify signature before processing

**Priority:** P0

**Current Status:** BROKEN — Signature check bypassed when missing

**Frontend:**
- No frontend changes needed

**Backend:**
- `apps/api/src/payments/payments.controller.ts` — Reject webhook if `signature` or `rawBody` is falsy
- Return HTTP 400 with error message

**Database:**
- No changes

**Authentication:** N/A (webhook endpoint)

**Authorization:** N/A (webhook endpoint)

**Dependencies:** None

**Acceptance Criteria:**
- Webhook with valid signature is processed
- Webhook with missing signature returns 400
- Webhook with invalid signature returns 400
- No order status changes when signature is invalid

**Testing:**
- POST to webhook with valid signature → order updated
- POST to webhook without signature header → 400
- POST to webhook with wrong signature → 400

---

## P0-2: Rate Limiting

**Feature:** API rate limiting to prevent abuse

**Priority:** P0

**Current Status:** MISSING — No rate limiting configured

**Frontend:**
- No changes needed (handle 429 responses gracefully)

**Backend:**
- Install `@nestjs/throttler`
- Configure in `app.module.ts`: `{ provide: APP_GUARD, useClass: ThrottlerGuard }`
- Global default: 60 requests/minute
- OTP endpoints: 5 requests/minute
- Login endpoints: 10 requests/minute

**Database:**
- No changes

**Authentication:** N/A

**Authorization:** N/A

**Dependencies:** None

**Acceptance Criteria:**
- Normal usage not affected (under limits)
- Exceeding limit returns HTTP 429
- OTP endpoint limited to 5 requests/minute per IP
- Login endpoint limited to 10 requests/minute per IP
- Rate limit headers included in responses

**Testing:**
- Send 6 requests to `/api/auth/send-otp` within 1 minute → 6th returns 429
- Normal browsing → no 429 errors

---

## P0-3: JWT Fallback Secrets

**Feature:** Application must refuse to start without proper JWT secrets

**Priority:** P0

**Current Status:** BROKEN — Falls back to guessable defaults

**Frontend:**
- No changes

**Backend:**
- `apps/api/src/auth/auth.service.ts` — Remove fallback `'access-secret'`/`'refresh-secret'`
- `apps/api/src/auth/jwt.strategy.ts` — Remove fallback
- `apps/api/src/auth/auth.module.ts` — Remove fallback
- `apps/api/src/sellers/sellers.service.ts` — Remove fallback
- Throw `ConfigService` error on startup if secrets not set

**Database:**
- No changes

**Acceptance Criteria:**
- Application crashes on startup if `JWT_ACCESS_SECRET` not set
- Application crashes on startup if `JWT_REFRESH_SECRET` not set
- Application starts normally when both are set

**Testing:**
- Start without JWT_ACCESS_SECRET → error, no startup
- Start with both secrets → normal startup

---

## P0-4: Cryptographic OTP Generation

**Feature:** OTP must use cryptographically secure random

**Priority:** P0

**Current Status:** BROKEN — Uses Math.random()

**Frontend:**
- No changes

**Backend:**
- `apps/api/src/auth/auth.service.ts:22` — Replace `Math.floor(100000 + Math.random() * 900000)` with `crypto.randomInt(100000, 999999)`

**Database:**
- No changes

**Acceptance Criteria:**
- OTPs are cryptographically random
- OTPs are still 6 digits
- No change in user experience

**Testing:**
- Generate 1000 OTPs → all are 6 digits, no predictable pattern

---

# P1 — High Priority

---

## P1-1: Fix Payment Success Page

**Feature:** Payment success page must display actual payment status

**Priority:** P1

**Current Status:** BROKEN — Always passes 0 to API

**Frontend:**
- `apps/web/app/payment/success/page.tsx:19` — Read `checkoutId` from search params, pass to `paymentsApi.getStatus(checkoutId)`

**Backend:**
- No changes

**Database:**
- No changes

**Acceptance Criteria:**
- After successful payment, success page shows correct payment status
- checkoutId is read from URL search params

**Testing:**
- Complete a payment → success page shows "Payment Successful"

---

## P1-2: Fix Payment Retry

**Feature:** Payment retry must use actual checkout ID

**Priority:** P1

**Current Status:** BROKEN — Always passes 0

**Frontend:**
- `apps/web/app/payment/failure/page.tsx:20` — Read `checkoutId` from search params, pass to `paymentsApi.retry(checkoutId)`

**Backend:**
- No changes

**Acceptance Criteria:**
- Retry button sends correct checkoutId
- Retry creates new Razorpay order for same checkout

---

## P1-3: Fix Hardcoded localhost URLs

**Feature:** All API calls must use environment-aware configuration

**Priority:** P1

**Current Status:** BROKEN — 4 hardcoded URLs in seller/admin

**Frontend:**
- `apps/web/app/seller/products/page.tsx:23` — Replace `fetch('http://localhost:5000/api/products/${id}', ...)` with `productsApi.delete(id)`
- `apps/web/app/seller/products/page.tsx:32` — Replace with `productsApi.restore(id)`
- `apps/web/app/seller/products/page.tsx:48` — Replace with `getProductImageUrl(p.image)`
- `apps/web/app/admin/orders/page.tsx:36` — Replace with `adminOrdersApi.updateStatus(id, status)`

**Backend:**
- No changes

**Acceptance Criteria:**
- No hardcoded URLs in any frontend file
- Seller products page works with any API URL
- Admin orders page works with any API URL

---

## P1-4: Add Middleware for Seller/Admin Routes

**Feature:** Seller and admin pages must be protected by middleware

**Priority:** P1

**Current Status:** MISSING — Any user can access

**Frontend:**
- `apps/web/middleware.ts` — Add rules:
  - `/seller/*` (except `/seller/login`, `/seller/signup`) → require seller token
  - `/admin/*` → require admin token

**Backend:**
- No changes

**Acceptance Criteria:**
- Unauthenticated user visiting `/seller/dashboard` → redirected to `/seller/login`
- Customer visiting `/admin/dashboard` → redirected to `/`
- Seller visiting `/admin/dashboard` → redirected to `/seller/dashboard`
- Seller logged in → can access `/seller/*`
- Admin logged in → can access `/admin/*`

---

## P1-5: Replace alert() with Toast

**Feature:** Payment errors should use toast notifications

**Priority:** P1

**Current Status:** Uses native alert()

**Frontend:**
- `apps/web/app/checkout/page.tsx:203` — Replace `alert(err.message)` with `toast.error(err.message)`

**Backend:**
- No changes

**Acceptance Criteria:**
- Payment errors show as toast notifications
- No native alert() calls in production code

---

## P1-6: Swagger Production Guard

**Feature:** Swagger docs must not be exposed in production

**Priority:** P1

**Current Status:** Always enabled

**Backend:**
- `apps/api/src/main.ts:57` — Wrap Swagger setup in `if (configService.get('NODE_ENV') !== 'production')`

**Acceptance Criteria:**
- Development: `/api/docs` accessible
- Production: `/api/docs` returns 404

---

## P1-7: Error Message Sanitization

**Feature:** Non-HTTP exceptions must not expose internal details

**Priority:** P1

**Current Status:** Leaks exception.message

**Backend:**
- `apps/api/src/common/filters/all-exceptions.filter.ts:31` — For non-HTTP exceptions, return generic message "Internal server error"
- Log full error details server-side via Pino

**Acceptance Criteria:**
- HTTP exceptions return their message
- Non-HTTP exceptions return "Internal server error"
- Full error details logged server-side

---

## P1-8: Cookie Path on Clear

**Feature:** Cookie clearing must specify correct path

**Priority:** P1

**Current Status:** clearCookie without path

**Backend:**
- `apps/api/src/auth/auth.controller.ts:89-90` — Add `path: '/'` to both `clearCookie` calls

**Acceptance Criteria:**
- Logout clears cookies in all browsers

---

# P2 — Medium Priority

---

## P2-1: Database Indexes

**Feature:** Add missing indexes for query performance

**Priority:** P2

**Current Status:** Missing indexes cause full table scans

**Database:**
- `prisma/schema.prisma`:
  - Product: `@@index([ptype])`
  - Product: `@@index([price])`
  - Product: `@@index([deletedAt])`
  - RefreshToken: `@@index([userId, revoked])`
  - Order: `@@index([email])`
  - Order: `@@index([status])`
- Run `prisma migrate dev`

**Acceptance Criteria:**
- Category queries use index
- Price sort queries use index
- Soft delete filter uses index

---

## P2-2: Pagination on List Endpoints

**Feature:** All list endpoints must support pagination

**Priority:** P2

**Current Status:** Unbounded results

**Backend:**
- Add `page` and `limit` query params to: `getAllOrders`, `getOrdersByUser`, `getSellerOrders`, `getAllUsers`, `getAllProducts`, `findAllForAdmin`, `getByProduct` (reviews), `getMyReviews`

**Frontend:**
- Update DataTable component to handle server-side pagination
- Update admin, seller, and customer list pages

**Acceptance Criteria:**
- All list endpoints accept `page` and `limit` params
- Default limit: 20
- Response includes `total` and `totalPages`

---

## P2-3: N+1 Query Fix

**Feature:** Batch product lookups in cart/checkout

**Priority:** P2

**Current Status:** Product lookup per cart item

**Backend:**
- `payments.service.ts` — Replace loop findFirst with batch findMany
- `checkout.service.ts` — Same fix

**Acceptance Criteria:**
- Cart checkout with 10 items triggers 1 product query, not 10

---

## P2-4: Coupon UI in Checkout

**Feature:** Customers should be able to apply coupon codes during checkout

**Priority:** P2

**Current Status:** Backend ready, no frontend UI

**Frontend:**
- Add coupon input field to checkout form
- Add "Apply" button → `couponsApi.validate(code, amount)`
- Display discount in order summary
- Pass `couponCode` to payment checkout

**Backend:**
- No changes needed

**Acceptance Criteria:**
- Customer can enter coupon code
- Valid coupon shows discount
- Invalid coupon shows error
- Discount reflected in total

---

## P2-5: Integrate Rich Product Detail Component

**Feature:** Use the existing richer product-detail-client.tsx

**Priority:** P2

**Current Status:** Richer component exists but unused

**Frontend:**
- Integrate features from `product-detail-client.tsx` into active `page.tsx`:
  - ProductGallery
  - ProductReviews
  - ReviewForm
  - RatingSummary
  - Wishlist toggle
  - Related products

**Acceptance Criteria:**
- Product detail page shows reviews
- Product detail page has wishlist toggle
- Product detail page shows related products

---

## P2-6: Canonical URLs

**Feature:** Add canonical URL tags for SEO

**Priority:** P2

**Frontend:**
- Add `<link rel="canonical">` to page metadata in each page

**Acceptance Criteria:**
- Each page has a canonical URL pointing to itself

---

## P2-7: JSON-LD Structured Data

**Feature:** Add product schema markup for rich snippets

**Priority:** P2

**Frontend:**
- Add Product JSON-LD script tag to product detail pages
- Add BreadcrumbList to category pages

**Acceptance Criteria:**
- Google Rich Results Test passes for product pages

---

# P3 — Low Priority

---

## P3-1: Dead Code Cleanup

**Feature:** Remove unused files and code

**Priority:** P3

**Frontend:**
- Delete `product-detail-client.tsx` (if integrated per P2-5)
- Delete `server-product.service.ts`
- Remove `useUIStore` from store
- Remove `OrderDashboard` type
- Remove unused API module methods
- Delete `confirmation/page.tsx` (orphaned)

**Backend:**
- Delete `create-test-img.js`, `start-debug.js`, `test-upload.js`

**Acceptance Criteria:**
- No dead files in the codebase
- Build succeeds after removal

---

## P3-2: TypeScript `any` Cleanup

**Feature:** Replace all `any` types with proper types

**Priority:** P3

**Scope:** 132 occurrences across API and frontend

**Acceptance Criteria:**
- Zero `any` types in the codebase
- TypeScript strict mode passes

---

## P3-3: Console.log Cleanup

**Feature:** Remove development debugging from production code

**Priority:** P3

**Scope:** 23 console.log/error statements

**Acceptance Criteria:**
- No console.log in production source code
- Pino logger used for all logging

---

## P3-4: Accessibility Improvements

**Feature:** Improve keyboard navigation and screen reader support

**Priority:** P3

**Frontend:**
- Add skip-to-content link
- Add alt text to all product images
- Add ARIA labels to interactive elements
- Test keyboard navigation

**Acceptance Criteria:**
- All forms navigable by keyboard
- All images have alt text
- Screen reader can navigate all pages

---

# P4 — Future

---

## P4-1: Return/Refund Frontend

**Feature:** Customer return request UI

**Priority:** P4

**Frontend:**
- `/account/returns` page
- Return request form
- Return status tracking

**Backend:**
- Return/Refund models exist
- May need additional API endpoints

---

## P4-2: Notification Preferences UI

**Feature:** User notification settings

**Priority:** P4

**Frontend:**
- Add to account settings
- Toggle order, payment, promotional notifications

---

## P4-3: Advanced Search/Filtering

**Feature:** Enhanced product search

**Priority:** P4

**Frontend:**
- Price range filter
- Sort options (price, popularity, newest)
- Category filter checkboxes

---

## P4-4: Seller Analytics

**Feature:** Enhanced seller dashboard with charts

**Priority:** P4

**Frontend:**
- Sales trend charts
- Order status breakdown
- Product performance metrics

---

## P4-5: Admin Audit Log Viewer

**Feature:** View system audit logs

**Priority:** P4

**Frontend:**
- `/admin/audit-logs` page
- Filter by action, entity, actor, date

**Backend:**
- AuditLog model exists
- May need list endpoint with pagination
