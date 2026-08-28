# MISSING-FEATURES.md — Beauty Queen E-commerce

## Summary

| Category | Missing Features | Critical | High | Medium | Low |
|----------|-----------------|----------|------|--------|-----|
| Authentication & Security | 8 | 3 | 3 | 2 | 0 |
| Product Management | 9 | 0 | 2 | 5 | 2 |
| Shopping Cart | 5 | 0 | 1 | 3 | 1 |
| Checkout | 6 | 0 | 1 | 2 | 1 |
| Payment | 0 | 0 | 0 | 0 | 0 |
| Order Management | 6 | 0 | 1 | 2 | 1 |
| Email Notifications | 5 | 0 | 3 | 2 | 0 |
| Search | 4 | 0 | 1 | 2 | 1 |
| UI/UX | 8 | 0 | 0 | 2 | 3 |
| Seller/Admin | 7 | 0 | 1 | 3 | 3 |
| Performance | 4 | 0 | 0 | 2 | 1 |
| SEO & Marketing | 5 | 0 | 1 | 2 | 2 |
| Infrastructure | 3 | 0 | 0 | 0 | 1 |
| **TOTAL** | **70** | **3** | **14** | **28** | **17** |

---

## Phase 9 — Customer Account, Addresses, Wishlist, Reviews & Ratings

### NEWLY IMPLEMENTED (Phase 9)

| Feature | Status | Description |
|---------|--------|-------------|
| Customer Account Dashboard | NEWLY IMPLEMENTED | `/account` page with links to profile, orders, addresses, wishlist, reviews |
| Profile Management | MIGRATED | `GET/PATCH /api/users/me` with backend validation |
| Address CRUD | MIGRATED | Full address management: create, read, update, delete, set default |
| Address Ownership | MIGRATED | Backend verifies userId on all address operations |
| Default Address | MIGRATED | Transaction-safe default address setting (unsets previous default) |
| Wishlist Toggle | MIGRATED | Add/remove from wishlist with duplicate prevention |
| Wishlist Page | MIGRATED | `/wishlist` with product grid, clear all |
| Review System | MIGRATED | Create, update, delete reviews with 1-5 rating validation |
| Review Moderation | NEWLY IMPLEMENTED | PENDING/APPROVED/REJECTED status, admin moderation API |
| Verified Purchase Check | NEWLY IMPLEMENTED | Reviews checked against delivered orders |
| Rating Summary | MIGRATED | Average rating and review count per product |
| Product Review UI | NEWLY IMPLEMENTED | ReviewForm, ReviewCard, RatingSummary, ProductReviews components |
| Account Navigation | NEWLY IMPLEMENTED | Header links to Account, Wishlist (with count badge) |
| Route Protection | NEWLY IMPLEMENTED | Next.js middleware protecting /account and /checkout routes |
| Custom Hooks | NEWLY IMPLEMENTED | useCurrentUser, useAddresses, useWishlist, useOrders, useReviews, useNotifications, useUnreadNotificationCount |
| Database Indexes | NEWLY IMPLEMENTED | Indexes on addresses(userId), reviews(productId, status), wishlistItems(productId) |
| Account Notifications Page | COMPLETE | `/account/notifications` with paginated list, mark-read, mark-all-read |

### NOT IMPLEMENTED (Phase 9)

| Feature | Status | Reason |
|---------|--------|--------|
| Email Change Verification | NOT IMPLEMENTED | Email change allowed directly; verification flow deferred to future |
| Checkout Address Selector | NOT IMPLEMENTED | Saved addresses exist but checkout doesn't yet offer address selection |
| Wishlist Heart on Product Cards | NOT IMPLEMENTED | Heart toggle exists on product detail page only |

---

## Category: Authentication & Security

### Feature: Password Hashing
- **Current Status:** NOT IMPLEMENTED
- **What Exists:** Seller passwords stored in plain text in database
- **What's Missing:** Bcrypt or Argon2 hashing for all passwords
- **Impact:** Database leak exposes all seller credentials
- **Priority:** CRITICAL
- **Recommended Approach:** Use bcrypt with salt rounds 12 in sellerController
- **Dependencies:** bcryptjs npm package
- **Effort:** 1 hour
- **Migration Status:** FIXED in backend (bcryptjs added)

### Feature: CSRF Protection
- **Current Status:** NOT IMPLEMENTED
- **What Exists:** No CSRF tokens on any forms
- **What's Missing:** CSRF token validation for all state-changing requests
- **Impact:** Cross-site request forgery attacks possible on all forms
- **Priority:** CRITICAL
- **Recommended Approach:** Use csurf middleware or double-submit cookie pattern
- **Dependencies:** None
- **Effort:** 4 hours
- **Migration Status:** NOT FIXED

### Feature: Rate Limiting
- **Current Status:** NOT IMPLEMENTED
- **What Exists:** No limits on API requests
- **What's Missing:** Rate limiting on OTP endpoints, login, and general API
- **Impact:** Brute force attacks, spam OTP requests, DoS
- **Priority:** HIGH
- **Recommended Approach:** express-rate-limit on /api/auth/* routes (5 req/min for OTP, 10 req/min for login)
- **Dependencies:** express-rate-limit
- **Effort:** 2 hours
- **Migration Status:** NOT FIXED

### Feature: Session Management
- **Current Status:** NOT IMPLEMENTED
- **What Exists:** Plain cookies with 1-year expiry
- **What's Missing:** Server-side session storage, session invalidation, concurrent session limits
- **Impact:** Stolen cookies give permanent access, no logout everywhere
- **Priority:** HIGH
- **Recommended Approach:** Use express-session with MySQL store, 24-hour expiry
- **Dependencies:** express-session, connect-session-knex
- **Effort:** 4 hours
- **Migration Status:** NOT FIXED

### Feature: Cookie Signing
- **Current Status:** NOT IMPLEMENTED
- **What Exists:** Unsigned cookies that can be tampered with
- **What's Missing:** Cryptographic signing of all cookies
- **Impact:** Cart/email cookies can be modified by client
- **Priority:** HIGH
- **Recommended Approach:** Use cookie-parser secret, sign all cookies
- **Dependencies:** None (cookie-parser already installed)
- **Effort:** 2 hours
- **Migration Status:** NOT FIXED

### Feature: Input Sanitization
- **Current Status:** PARTIALLY IMPLEMENTED
- **What Exists:** Basic parameterized queries prevent SQL injection
- **What's Missing:** XSS prevention, HTML sanitization, input length limits
- **Impact:** Stored XSS possible through product names/descriptions
- **Priority:** MEDIUM
- **Recommended Approach:** Use xss or DOMPurify for user-generated content
- **Dependencies:** xss npm package
- **Effort:** 3 hours
- **Migration Status:** NOT FIXED

### Feature: Password Complexity
- **Current Status:** NOT IMPLEMENTED
- **What Exists:** No validation on password strength
- **What's Missing:** Minimum length, complexity requirements
- **Impact:** Weak passwords easily guessed
- **Priority:** MEDIUM
- **Recommended Approach:** Enforce 8+ chars, uppercase, lowercase, number in signup
- **Dependencies:** None
- **Effort:** 1 hour
- **Migration Status:** NOT FIXED (seller signup still accepts any password)

### Feature: Account Lockout
- **Current Status:** NOT IMPLEMENTED
- **What Exists:** Infinite login attempts allowed
- **What's Missing:** Lock account after N failed attempts
- **Impact:** Brute force attacks feasible
- **Priority:** HIGH
- **Recommended Approach:** Track failed attempts, lock for 15 minutes after 5 failures
- **Dependencies:** Rate limiting or session store
- **Effort:** 3 hours
- **Migration Status:** NOT FIXED

---

## Category: Product Management

### Feature: Price Validation
- **Current Status:** IMPLEMENTED
- **What Exists:** Server-side validation in Product DTOs (Min(0), IsInt)
- **What's Missing:** Real-time price verification at checkout
- **Impact:** Price manipulation still possible at checkout
- **Priority:** HIGH
- **Recommended Approach:** Always query DB for price during checkout, never trust frontend
- **Dependencies:** None
- **Effort:** 2 hours
- **Migration Status:** FIXED in Phase 4

### Feature: Product Pagination
- **Current Status:** IMPLEMENTED
- **What Exists:** Page/limit pagination in GET /api/products with page, limit, total, totalPages
- **What's Missing:** - 
- **Impact:** Products now paginated (20 per page default)
- **Priority:** HIGH
- **Recommended Approach:** Already implemented
- **Dependencies:** None
- **Effort:** -
- **Migration Status:** FIXED in Phase 4

### Feature: Advanced Filtering
- **Current Status:** NOT IMPLEMENTED
- **What Exists:** Category filtering only (ptype field)
- **What's Missing:** Price range, size availability, stock status filters
- **Impact:** Users can't narrow product searches
- **Priority:** MEDIUM
- **Recommended Approach:** Add query params: ?minPrice=&maxPrice=&size=&inStock=true
- **Dependencies:** Product API
- **Effort:** 4 hours
- **Migration Status:** NOT FIXED (documented for future)

### Feature: Product Sorting
- **Current Status:** IMPLEMENTED
- **What Exists:** Sort options: price_asc, price_desc, newest, name_asc, name_desc
- **What's Missing:** -
- **Impact:** Users can sort products by preference
- **Priority:** MEDIUM
- **Recommended Approach:** Already implemented
- **Dependencies:** None
- **Effort:** -
- **Migration Status:** FIXED in Phase 4

### Feature: Category Management
- **Current Status:** PARTIALLY IMPLEMENTED
- **What Exists:** Categories API (GET all, GET by slug), hardcoded categories preserved
- **What's Missing:** Admin UI to create/edit/delete categories
- **Impact:** New categories require code changes
- **Priority:** MEDIUM
- **Recommended Approach:** Create categories table, CRUD API, admin page
- **Dependencies:** Database migration, admin auth
- **Effort:** 8 hours
- **Migration Status:** NOT FIXED (categories preserved as-is per migration rules)

### Feature: Product Images Update
- **Current Status:** IMPLEMENTED
- **What Exists:** Image upload on create and update, Sharp processing, file validation
- **What's Missing:** Image reordering, individual image deletion
- **Impact:** Images can now be updated on product edit
- **Priority:** MEDIUM
- **Recommended Approach:** Already implemented
- **Dependencies:** Image upload service
- **Effort:** -
- **Migration Status:** FIXED in Phase 4

### Feature: Soft Delete
- **Current Status:** IMPLEMENTED
- **What Exists:** Soft delete via deletedAt field, restore capability
- **What's Missing:** Audit trail
- **Impact:** Products can be deleted and restored
- **Priority:** MEDIUM
- **Recommended Approach:** Already implemented
- **Dependencies:** None
- **Effort:** -
- **Migration Status:** FIXED in Phase 4

### Feature: Product SKU
- **Current Status:** NOT IMPLEMENTED
- **What Exists:** No unique product identifier beyond auto-increment ID
- **What's Missing:** SKU field for inventory management
- **Impact:** No standard product identification
- **Priority:** LOW
- **Recommended Approach:** Add sku VARCHAR column, unique constraint
- **Dependencies:** Database migration
- **Effort:** 2 hours
- **Migration Status:** NOT FIXED

### Feature: Low Stock Alerts
- **Current Status:** NOT IMPLEMENTED
- **What Exists:** Stock counts in size_s through size_xxl
- **What's Missing:** Alert when stock falls below threshold
- **Impact:** Sellers unaware of low inventory
- **Priority:** LOW
- **Recommended Approach:** Check stock after each order, notify if below threshold
- **Dependencies:** Notification system
- **Effort:** 3 hours
- **Migration Status:** NOT FIXED

---

## Category: Shopping Cart

### Feature: Cart Count Badge
- **Current Status:** NOT IMPLEMENTED
- **What Exists:** Cart icon in navbar but no item count
- **What's Missing:** Badge showing number of items in cart
- **Impact:** Users don't know cart status without clicking
- **Priority:** HIGH
- **Recommended Approach:** Add cart count to navbar, update on add/remove
- **Dependencies:** Cart API
- **Effort:** 2 hours
- **Migration Status:** NOT FIXED

### Feature: Server-Side Cart
- **Current Status:** NOT IMPLEMENTED
- **What Exists:** Cart stored in cookie (lost if cleared, limited size)
- **What's Missing:** Server-side cart storage tied to session
- **Impact:** Cart lost on cookie clear, can't sync across devices
- **Priority:** MEDIUM
- **Recommended Approach:** Create cart table, store items server-side
- **Dependencies:** Session management, database migration
- **Effort:** 8 hours
- **Migration Status:** NOT FIXED

### Feature: Stock Validation at Checkout
- **Current Status:** PARTIALLY IMPLEMENTED
- **What Exists:** Stock checked at add-to-cart, but not re-checked at checkout
- **What's Missing:** Final stock validation before order creation
- **Impact:** Overselling possible if stock changes between add and checkout
- **Priority:** MEDIUM
- **Recommended Approach:** Re-validate all cart items stock at checkout submission
- **Dependencies:** Product API
- **Effort:** 3 hours
- **Migration Status:** NOT FIXED

### Feature: Size Change in Cart
- **Current Status:** NOT IMPLEMENTED
- **What Exists:** Must remove item and re-add with different size
- **What's Missing:** Inline size change on cart page
- **Impact:** Poor UX for size changes
- **Priority:** MEDIUM
- **Recommended Approach:** Add size selector dropdown in cart row
- **Dependencies:** Cart API
- **Effort:** 3 hours
- **Migration Status:** NOT FIXED

### Feature: Cart Persistence Across Devices
- **Current Status:** NOT IMPLEMENTED
- **What Exists:** Cookie-based cart (device-specific)
- **What's Missing:** Cart synced across devices for logged-in users
- **Impact:** Different carts on phone vs desktop
- **Priority:** LOW
- **Recommended Approach:** Server-side cart tied to user account
- **Dependencies:** User accounts, server-side cart
- **Effort:** 6 hours
- **Migration Status:** NOT FIXED

---

## Category: Checkout

### Feature: Form Validation
- **Current Status:** IMPLEMENTED
- **What Exists:** Zod + react-hook-form on checkout page with name, email, phone, address, pincode, district validation
- **What's Missing:** -
- **Impact:** Full form validation on checkout
- **Priority:** CRITICAL
- **Recommended Approach:** Already implemented
- **Dependencies:** None
- **Effort:** -
- **Migration Status:** FIXED in Phase 4

### Feature: Saved Addresses
- **Current Status:** MIGRATED (Phase 9)
- **What Exists:** Full address CRUD (create, read, update, delete, set default), Address model in Prisma, backend API endpoints
- **What's Missing:** Checkout address selector integration (saved address selection during checkout)
- **Impact:** Users can manage addresses; checkout still uses manual entry
- **Priority:** HIGH
- **Recommended Approach:** Add saved address selector in checkout page
- **Dependencies:** Address API
- **Effort:** 3 hours
- **Migration Status:** MIGRATED in Phase 9 (address management), checkout integration is FUTURE

### Feature: Delivery Charge Calculation
- **Current Status:** PARTIALLY IMPLEMENTED
- **What Exists:** Complex string matching for delivery zones
- **What's Missing:** Proper pincode-based delivery rate lookup
- **Impact:** Inaccurate delivery charges
- **Priority:** HIGH
- **Recommended Approach:** Use Indian pincode API or delivery zone database
- **Dependencies:** External API or database
- **Effort:** 4 hours
- **Migration Status:** NOT FIXED

### Feature: Order Summary
- **Current Status:** NOT IMPLEMENTED
- **What Exists:** Total shown but no itemized summary during checkout
- **What's Missing:** Clear order summary with items, prices, taxes, shipping
- **Impact:** Users unclear what they're paying for
- **Priority:** MEDIUM
- **Recommended Approach:** Add order summary sidebar in checkout page
- **Dependencies:** None
- **Effort:** 3 hours
- **Migration Status:** NOT FIXED

### Feature: Guest Checkout
- **Current Status:** PARTIALLY IMPLEMENTED
- **What Exists:** Checkout works without login (cookie-based)
- **What's Missing:** Clear "guest checkout" flow, optional account creation
- **Impact:** Confusing whether login required
- **Priority:** MEDIUM
- **Recommended Approach:** Add "Continue as guest" option, post-checkout account creation prompt
- **Dependencies:** Auth system
- **Effort:** 4 hours
- **Migration Status:** NOT FIXED

### Feature: Checkout Step Indicators
- **Current Status:** NOT IMPLEMENTED
- **What Exists:** Single-page checkout form
- **What's Missing:** Multi-step checkout (1. Shipping → 2. Payment → 3. Review)
- **Impact:** Long form overwhelming
- **Priority:** LOW
- **Recommended Approach:** Split checkout into steps with progress indicator
- **Dependencies:** Frontend state management
- **Effort:** 6 hours
- **Migration Status:** NOT FIXED

---

## Category: Payment

### Feature: Payment Verification
- **Current Status:** IMPLEMENTED
- **What Exists:** Server-side Razorpay signature verification (HMAC-SHA256, timing-safe) PLUS provider cross-check via `razorpay.payments.fetch` (amount, currency, order_id, status) before orders are confirmed
- **What's Missing:** -
- **Impact:** Backend is the source of truth; amount tampering cannot mark orders paid
- **Priority:** CRITICAL
- **Recommended Approach:** Already implemented
- **Dependencies:** Razorpay SDK
- **Effort:** -
- **Migration Status:** FIXED in Phase 6

### Feature: Payment Status Tracking
- **Current Status:** IMPLEMENTED
- **What Exists:** PaymentStatus enum (Pending, Completed, Failed, Refunded), payment_status field on orders, Payment model with Razorpay status tracking
- **What's Missing:** -
- **Impact:** Full payment state tracking
- **Priority:** HIGH
- **Recommended Approach:** Already implemented
- **Dependencies:** None
- **Effort:** -
- **Migration Status:** FIXED in Phase 4 (extended in Phase 6 with REFUNDED/PARTIALLY_REFUNDED + status APIs)

### Feature: Failed Payment Handling
- **Current Status:** IMPLEMENTED
- **What Exists:** `/payment/failure` page reading real checkout status, retry via backend `POST /api/payments/retry` (checkoutId-based, attempt-tracking), `payment.failed` webhook handler with coupon release + PAYMENT_FAILED notification
- **What's Missing:** -
- **Impact:** Users can retry failed payments; failure state is authoritative
- **Priority:** HIGH
- **Recommended Approach:** Already implemented
- **Dependencies:** Payment system
- **Effort:** -
- **Migration Status:** FIXED in Phase 6

### Feature: Refund Integration
- **Current Status:** IMPLEMENTED
- **What Exists:** Admin `POST /api/payments/:paymentId/refund` (full/partial) using Razorpay refunds API, duplicate-refund protection, webhook processors for `refund.processed/created/failed`, automatic payment status refresh (REFUNDED/PARTIALLY_REFUNDED), refund lifecycle notifications
- **What's Missing:** Admin UI for initiating refunds (API-ready)
- **Impact:** Refunds processed programmatically instead of manually
- **Priority:** MEDIUM
- **Recommended Approach:** Already implemented (API); admin UI deferred to future
- **Dependencies:** Razorpay SDK, payment status tracking
- **Effort:** 6 hours
- **Migration Status:** FIXED in Phase 6 (backend)

### Feature: Payment Webhooks
- **Current Status:** IMPLEMENTED
- **What Exists:** `/api/payments/webhook` with mandatory signature + raw body (HTTP 400 when missing), event persistence to `payment_webhook_events` (idempotent), rendered handlers for payment.captured/failed/authorized and refund.processed/created/failed
- **What's Missing:** -
- **Impact:** Payment confirmation driven by verified webhooks, not frontend redirect
- **Priority:** LOW
- **Recommended Approach:** Already implemented
- **Dependencies:** Razorpay dashboard config
- **Effort:** -
- **Migration Status:** FIXED in Phase 6

---

## Category: Order Management

### Feature: Order Grouping
- **Current Status:** NOT IMPLEMENTED
- **What Exists:** Each cart item becomes separate order row
- **What's Missing:** Group multi-item orders under single order_id
- **Impact:** Confusing order history, no "complete order" concept
- **Priority:** HIGH
- **Recommended Approach:** Add order_id column, group items in order display
- **Dependencies:** Database migration
- **Effort:** 6 hours
- **Migration Status:** NOT FIXED

### Feature: Order Confirmation Email
- **Current Status:** IMPLEMENTED
- **What Exists:** BullMQ email queue with Brevo integration, order-created event triggers email
- **What's Missing:** Brevo API key configuration in .env
- **Impact:** Email sending when BREVO_API_KEY is configured
- **Priority:** HIGH
- **Recommended Approach:** Already implemented in Phase 7
- **Dependencies:** Brevo API key in .env
- **Effort:** -
- **Migration Status:** FIXED in Phase 7

### Feature: Order Cancellation
- **Current Status:** IMPLEMENTED
- **What Exists:** POST /api/orders/:id/cancel endpoint, stock restoration, status transition validation
- **What's Missing:** -
- **Impact:** Customers can cancel Pending/Confirmed orders
- **Priority:** MEDIUM
- **Recommended Approach:** Already implemented in Phase 7
- **Dependencies:** Order status system
- **Effort:** -
- **Migration Status:** FIXED in Phase 7

### Feature: Order Status History
- **Current Status:** IMPLEMENTED
- **What Exists:** OrderStatusHistory model, status history API, history endpoint per order
- **What's Missing:** -
- **Impact:** Full audit trail of status changes
- **Priority:** MEDIUM
- **Recommended Approach:** Already implemented
- **Dependencies:** None
- **Effort:** -
- **Migration Status:** FIXED in Phase 4

### Feature: Order Detail Page
- **Current Status:** IMPLEMENTED
- **What Exists:** /orders/[id] page with product, address, payment, timeline
- **What's Missing:** -
- **Impact:** Users can view full order details
- **Priority:** MEDIUM
- **Recommended Approach:** Already implemented in Phase 7
- **Dependencies:** Order API
- **Effort:** -
- **Migration Status:** FIXED in Phase 7

### Feature: Invoice Generation
- **Current Status:** NOT IMPLEMENTED
- **What Exists:** No invoice system
- **What's Missing:** PDF invoice generation and download
- **Impact:** No formal receipt for orders
- **Priority:** LOW
- **Recommended Approach:** Use pdfkit or puppeteer to generate invoices
- **Dependencies:** PDF library
- **Effort:** 8 hours
- **Migration Status:** NOT FIXED

---

## Category: Email Notifications

### Feature: Order Confirmation Email
- **Current Status:** NOT IMPLEMENTED
- **What Exists:** OTP email only
- **What's Missing:** Email with order details after successful purchase
- **Impact:** No order record for customer
- **Priority:** HIGH
- **Recommended Approach:** HTML email template with order summary
- **Dependencies:** Brevo service
- **Effort:** 4 hours
- **Migration Status:** NOT FIXED

### Feature: Shipping Notification
- **Current Status:** IMPLEMENTED
- **What Exists:** BullMQ email queue triggers on status change to Shipped
- **What's Missing:** Brevo API key configuration
- **Impact:** Email sent when order ships
- **Priority:** HIGH
- **Recommended Approach:** Already implemented in Phase 7
- **Dependencies:** Brevo API key in .env
- **Effort:** -
- **Migration Status:** FIXED in Phase 7

### Feature: Delivery Confirmation
- **Current Status:** IMPLEMENTED
- **What Exists:** BullMQ email queue triggers on status change to Delivered
- **What's Missing:** Brevo API key configuration
- **Impact:** Email sent when order delivered
- **Priority:** HIGH
- **Recommended Approach:** Already implemented in Phase 7
- **Dependencies:** Brevo API key in .env
- **Effort:** -
- **Migration Status:** FIXED in Phase 7

### Feature: Email Templates
- **Current Status:** NOT IMPLEMENTED
- **What Exists:** Hardcoded HTML in router.js
- **What's Missing:** Separate template files, dynamic content
- **Impact:** Hard to maintain email designs
- **Priority:** MEDIUM
- **Recommended Approach:** Create HTML templates with variables
- **Dependencies:** Template engine or string replacement
- **Effort:** 4 hours
- **Migration Status:** NOT FIXED

### Feature: Promotional Emails
- **Current Status:** NOT IMPLEMENTED
- **What Exists:** None
- **What's Missing:** Marketing email campaigns
- **Impact:** No promotional capability
- **Priority:** MEDIUM
- **Recommended Approach:** Use Brevo marketing campaigns (external)
- **Dependencies:** Brevo marketing plan
- **Effort:** 2 hours (setup)
- **Migration Status:** NOT FIXED

---

## Category: Search

### Feature: Search Bar Visibility
- **Current Status:** IMPLEMENTED
- **What Exists:** SearchBar component in header with debounced live search
- **What's Missing:** -
- **Impact:** Search is prominent and functional
- **Priority:** HIGH
- **Recommended Approach:** Already implemented
- **Dependencies:** None
- **Effort:** -
- **Migration Status:** FIXED in Phase 4

### Feature: Search Autocomplete
- **Current Status:** IMPLEMENTED
- **What Exists:** Debounced live search with dropdown preview (300ms debounce)
- **What's Missing:** -
- **Impact:** Real-time search suggestions as user types
- **Priority:** MEDIUM
- **Recommended Approach:** Already implemented
- **Dependencies:** None
- **Effort:** -
- **Migration Status:** FIXED in Phase 4

### Feature: Search in Description
- **Current Status:** IMPLEMENTED
- **What Exists:** Search across name, description, and category (ptype)
- **What's Missing:** -
- **Impact:** Broader search results
- **Priority:** MEDIUM
- **Recommended Approach:** Already implemented
- **Dependencies:** Product API
- **Effort:** -
- **Migration Status:** FIXED in Phase 4

### Feature: Search Results Pagination
- **Current Status:** NOT IMPLEMENTED
- **What Exists:** All results returned at once
- **What's Missing:** Paginated search results
- **Impact:** Slow with many matches
- **Priority:** LOW
- **Recommended Approach:** Add pagination to search endpoint
- **Dependencies:** Product API pagination
- **Effort:** 2 hours
- **Migration Status:** NOT FIXED

---

## Category: UI/UX

### Feature: Loading States
- **Current Status:** IMPLEMENTED
- **What Exists:** loading.tsx global, spinner components on all pages (account, addresses, orders, wishlist, product detail, search)
- **What's Missing:** Skeleton screens (currently using spinners)
- **Impact:** Users see loading indicators during data fetch
- **Priority:** MEDIUM
- **Recommended Approach:** Already implemented with spinners
- **Dependencies:** None
- **Effort:** -
- **Migration Status:** FIXED in Phase 4/9

### Feature: Error Boundaries
- **Current Status:** IMPLEMENTED
- **What Exists:** error.tsx and not-found.tsx in app root
- **What's Missing:** Global error boundary
- **Impact:** Basic error handling exists
- **Priority:** MEDIUM
- **Recommended Approach:** Already implemented
- **Dependencies:** None
- **Effort:** -
- **Migration Status:** FIXED in Phase 4

### Feature: Toast Notifications
- **Current Status:** IMPLEMENTED
- **What Exists:** Sonner toast library installed, used for success/error feedback on profile updates, address operations, review submissions
- **What's Missing:** Toast feedback on add-to-cart, order placement
- **Impact:** Users get feedback on account-related actions
- **Priority:** MEDIUM
- **Recommended Approach:** Already implemented for account features
- **Dependencies:** None
- **Effort:** -
- **Migration Status:** FIXED in Phase 9 (account features)

### Feature: Image Lazy Loading
- **Current Status:** NOT IMPLEMENTED
- **What Exists:** All images loaded immediately
- **What's Missing:** Lazy loading for below-fold images
- **Impact:** Slow initial page load
- **Priority:** MEDIUM
- **Recommended Approach:** Use Next.js Image component with lazy loading
- **Dependencies:** None
- **Effort:** 2 hours
- **Migration Status:** NOT FIXED

### Feature: Image Zoom
- **Current Status:** NOT IMPLEMENTED
- **What Exists:** Click to swap main image
- **What's Missing:** Hover zoom or magnifier on product images
- **Impact:** Users can't see product details
- **Priority:** LOW
- **Recommended Approach:** Add image zoom library or CSS transform
- **Dependencies:** None
- **Effort:** 3 hours
- **Migration Status:** NOT FIXED

### Feature: Wishlist
- **Current Status:** MIGRATED (Phase 9)
- **What Exists:** Wishlist model, toggle API (add/remove), list, clear all, frontend wishlist page, heart icon on product detail
- **What's Missing:** Heart icon on product cards (grid view), wishlist count badge in header
- **Impact:** Users can save and manage products for later
- **Priority:** LOW
- **Recommended Approach:** Add heart toggle to ProductCard component
- **Dependencies:** Wishlist API
- **Effort:** 2 hours
- **Migration Status:** MIGRATED in Phase 9

### Feature: Product Reviews
- **Current Status:** MIGRATED (Phase 9)
- **What Exists:** Review model with ratings (1-5), comments, moderation status, one review per user per product, verified purchase check, admin moderation API, frontend review form and display on product pages
- **What's Missing:** None critical
- **Impact:** Full review system with ratings, moderation, and verified purchase tracking
- **Priority:** LOW
- **Recommended Approach:** Already implemented
- **Dependencies:** User accounts
- **Effort:** -
- **Migration Status:** MIGRATED in Phase 9

### Feature: Recently Viewed Products
- **Current Status:** NOT IMPLEMENTED
- **What Exists:** None
- **What's Missing:** Track and display recently viewed products
- **Impact:** No browsing history
- **Priority:** LOW
- **Recommended Approach:** Store in localStorage or cookie, show on homepage
- **Dependencies:** None
- **Effort:** 3 hours
- **Migration Status:** NOT FIXED

---

## Category: Seller/Admin

### Feature: Dashboard Analytics
- **Current Status:** NOT IMPLEMENTED
- **What Exists:** Product list only
- **What's Missing:** Sales stats, revenue charts, order counts
- **Impact:** No business insights
- **Priority:** HIGH
- **Recommended Approach:** Add stats cards, charts using recharts or chart.js
- **Dependencies:** Order/payment data
- **Effort:** 8 hours
- **Migration Status:** NOT FIXED

### Feature: Product Stock Bulk Update
- **Current Status:** NOT IMPLEMENTED
- **What Exists:** Edit one product at a time
- **What's Missing:** Bulk stock update, CSV import
- **Impact:** Time-consuming for many products
- **Priority:** MEDIUM
- **Recommended Approach:** Add bulk edit UI, CSV upload endpoint
- **Dependencies:** Product API
- **Effort:** 6 hours
- **Migration Status:** NOT FIXED

### Feature: Order Filters
- **Current Status:** IMPLEMENTED
- **What Exists:** Status filter, search, pagination, payment status filter on admin/seller pages
- **What's Missing:** Date range filter on seller page
- **Impact:** Admin/seller can filter orders effectively
- **Priority:** MEDIUM
- **Recommended Approach:** Already implemented in Phase 7
- **Dependencies:** Order API
- **Effort:** -
- **Migration Status:** FIXED in Phase 7

### Feature: Seller Profile
- **Current Status:** NOT IMPLEMENTED
- **What Exists:** Basic seller info stored
- **What's Missing:** Profile page, password change, business info
- **Impact:** No seller account management
- **Priority:** MEDIUM
- **Recommended Approach:** Create seller profile page with edit capability
- **Dependencies:** Auth system
- **Effort:** 4 hours
- **Migration Status:** NOT FIXED

### Feature: Multi-Seller Support
- **Current Status:** NOT IMPLEMENTED
- **What Exists:** Single seller level
- **What's Missing:** Multiple sellers with own products
- **Impact:** Single-vendor only
- **Priority:** LOW
- **Recommended Approach:** Add seller_id to products, filter by seller
- **Dependencies:** Major schema change
- **Effort:** 16 hours
- **Migration Status:** NOT FIXED

### Feature: Product Approval Workflow
- **Current Status:** NOT IMPLEMENTED
- **What Exists:** Products go live immediately
- **What's Missing:** Approval queue, publish/unpublish
- **Impact:** No content moderation
- **Priority:** LOW
- **Recommended Approach:** Add status column (draft/published/archived)
- **Dependencies:** Product table
- **Effort:** 4 hours
- **Migration Status:** NOT FIXED

### Feature: Seller Commission
- **Current Status:** NOT IMPLEMENTED
- **What Exists:** None
- **What's Missing:** Commission tracking for marketplace model
- **Impact:** No revenue sharing
- **Priority:** LOW
- **Recommended Approach:** Add commission_rate to seller, calculate on orders
- **Dependencies:** Multi-seller support
- **Effort:** 8 hours
- **Migration Status:** NOT FIXED

---

## Category: Performance

### Feature: Database Indexing
- **Current Status:** IMPLEMENTED
- **What Exists:** Indexes on orders(email), orders(status), orders(productId), orders(checkoutId), orders(userId), order_status_history(orderId), refresh_tokens(userId), cart_items unique constraint, wishlist_items unique constraint + productId, reviews unique constraint + productId + status, addresses(userId)
- **What's Missing:** -
- **Impact:** Proper indexing for all major query patterns
- **Priority:** HIGH
- **Recommended Approach:** Already implemented
- **Dependencies:** None
- **Effort:** -
- **Migration Status:** FIXED in Phase 9

### Feature: API Response Caching
- **Current Status:** NOT IMPLEMENTED
- **What Exists:** No caching headers
- **What's Missing:** Cache-Control headers for static product data
- **Impact:** Repeated requests hit database
- **Priority:** MEDIUM
- **Recommended Approach:** Add cache headers for product listing APIs
- **Dependencies:** None
- **Effort:** 2 hours
- **Migration Status:** NOT FIXED

### Feature: Image Optimization
- **Current Status:** PARTIALLY IMPLEMENTED
- **What Exists:** Sharp converts to WebP at 800px
- **What's Missing:** Multiple sizes, responsive images, CDN
- **Impact:** Full-size images loaded for thumbnails
- **Priority:** MEDIUM
- **Recommended Approach:** Generate thumbnails, use srcset, consider CDN
- **Dependencies:** Sharp processing pipeline
- **Effort:** 6 hours
- **Migration Status:** NOT FIXED

### Feature: Connection Pooling
- **Current Status:** PARTIALLY IMPLEMENTED
- **What Exists:** Pool size 10
- **What's Missing:** Pool monitoring, connection recycling, retry logic
- **Impact:** Connection leaks possible
- **Priority:** LOW
- **Recommended Approach:** Add pool event handlers, monitoring
- **Dependencies:** None
- **Effort:** 2 hours
- **Migration Status:** NOT FIXED

---

## Category: SEO & Marketing

### Feature: Meta Tags
- **Current Status:** IMPLEMENTED
- **What Exists:** Next.js generateMetadata for product pages and category pages
- **What's Missing:** -
- **Impact:** Product and category pages have proper SEO meta tags
- **Priority:** HIGH
- **Recommended Approach:** Already implemented
- **Dependencies:** None
- **Effort:** -
- **Migration Status:** FIXED in Phase 4

### Feature: Open Graph Tags
- **Current Status:** IMPLEMENTED
- **What Exists:** OG tags on product and category pages
- **What's Missing:** -
- **Impact:** Social media previews work for products
- **Priority:** MEDIUM
- **Recommended Approach:** Already implemented
- **Dependencies:** None
- **Effort:** -
- **Migration Status:** FIXED in Phase 4

### Feature: Structured Data
- **Current Status:** NOT IMPLEMENTED
- **What Exists:** None
- **What's Missing:** JSON-LD for products, breadcrumbs
- **Impact:** No rich snippets in search results
- **Priority:** MEDIUM
- **Recommended Approach:** Add Product schema markup
- **Dependencies:** None
- **Effort:** 4 hours
- **Migration Status:** NOT FIXED

### Feature: Sitemap
- **Current Status:** NOT IMPLEMENTED
- **What Exists:** None
- **What's Missing:** XML sitemap for search engines
- **Impact:** Pages not indexed properly
- **Priority:** LOW
- **Recommended Approach:** Generate sitemap.xml with Next.js
- **Dependencies:** None
- **Effort:** 2 hours
- **Migration Status:** NOT FIXED

### Feature: Social Media Links
- **Current Status:** NOT IMPLEMENTED
- **What Exists:** Share buttons on product page
- **What's Missing:** Store's social media profiles in footer
- **Impact:** No social presence
- **Priority:** LOW
- **Recommended Approach:** Add Instagram, Facebook, YouTube links to footer
- **Dependencies:** None
- **Effort:** 1 hour
- **Migration Status:** NOT FIXED

---

## Category: Infrastructure

### Feature: Database Migrations
- **Current Status:** NOT IMPLEMENTED
- **What Exists:** Raw SQL in query.txt
- **What's Missing:** Version-controlled migration system
- **Impact:** Schema changes untracked, hard to rollback
- **Priority:** HIGH
- **Recommended Approach:** Use Knex.js migrations or Prisma
- **Dependencies:** None
- **Effort:** 4 hours (setup)
- **Migration Status:** NOT FIXED

### Feature: Logging
- **Current Status:** IMPLEMENTED
- **What Exists:** Pino logger with pino-pretty, structured logging in all services
- **What's Missing:** -
- **Impact:** Proper structured logging for debugging
- **Priority:** MEDIUM
- **Recommended Approach:** Already implemented
- **Dependencies:** None
- **Effort:** -
- **Migration Status:** FIXED in Phase 4

### Feature: Health Check
- **Current Status:** IMPLEMENTED
- **What Exists:** GET /api/health endpoint in backend
- **What's Missing:** Database connectivity check, memory usage
- **Impact:** Basic health check exists
- **Priority:** LOW
- **Recommended Approach:** Enhance with DB ping, uptime, memory stats
- **Dependencies:** None
- **Effort:** 2 hours
- **Migration Status:** FIXED in Phase 4

---

## Phase 7 — Order Management (Completed)

### Implemented Features
- [x] Order status transition validation (Pending → Confirmed → Processing → Shipped → Delivered)
- [x] Order cancellation with stock restoration
- [x] Order status history with changedBy and note
- [x] Customer order list with pagination
- [x] Customer order detail page with timeline
- [x] Seller order management with pagination and filters
- [x] Admin order management with pagination, filters, and dashboard stats
- [x] Admin order detail page with status update
- [x] BullMQ email notifications for order events
- [x] Brevo integration for email sending
- [x] Email retry with exponential backoff
- [x] Dead letter queue configuration
- [x] Address snapshot (preserved from order creation)
- [x] Historical pricing (preserved from order creation)
- [x] Seller authorization (JWT-based, no frontend trust)
- [x] Admin authorization (RolesGuard)
- [x] Race condition protection (database transactions)
- [x] Proper error responses (no stack trace exposure)

### Remaining Phase 7 Items
- **Carrier Integration:** Real carrier tracking API integration (currently architecture-ready)
- **Refund Processing:** Razorpay refund API integration (documented in MISSING-FEATURES)
- **In-App Notifications:** Notification center UI (documented in MISSING-FEATURES)

---

## Phase 6 — Payment Hardening (Completed)

### Implemented Features
- [x] Server-side Razorpay signature verification (HMAC-SHA256, `crypto.timingSafeEqual`) on `POST /api/payments/verify`
- [x] Provider-side cross-check (`payments.fetch`) of amount/currency/order_id/status before confirming orders — mismatch marks payment FAILED, orders not confirmed
- [x] Webhook hardened: missing `x-razorpay-signature`/raw body → HTTP 400 (was 200 success)
- [x] Idempotent webhook processing via `payment_webhook_events` table + Redis distributed locks
- [x] Webhook event handlers: `payment.captured`, `payment.failed`, `payment.authorized`, `refund.processed`, `refund.created`, `refund.failed`
- [x] Backend-authoritative amounts everywhere (frontend never sends prices to Razorpay)
- [x] `POST /api/payments/create-order` (idempotent Razorpay order creation) + `POST /api/payments/checkout` (userId, method, metadata on Payment)
- [x] `POST /api/payments/retry` by `checkoutId` with attempt tracking (was order id, broken)
- [x] `POST /api/payments/:paymentId/refund` (admin, full/partial) with duplicate-refund protection and automatic status refresh
- [x] `GET /api/payments/checkout/:checkoutId/status` + `GET /api/payments/:id/status` with ownership enforcement
- [x] Payment page hardening: `/payment/success` + `/payment/failure` now read real backend status; success shown only after backend verification
- [x] `RazorpayCheckout` component (imperative open, lazy script load) replacing inline checkout Razorpay logic
- [x] Payment status polling (`PaymentStatusCard`) + sonner toasts replacing `alert()`
- [x] Rate limiting on all payment money endpoints (Redis-backed `RateLimitGuard`)
- [x] Payment notifications wired: PAYMENT_SUCCESS, PAYMENT_FAILED, refund lifecycle emails/in-app
- [x] Migration `20260827_phase6_payments` (payment.user_id/method/metadata, `payment_webhook_events` table, indexes)

### Remaining (deferred, documented elsewhere)
- Automated reconciliation/alerting for provider amount/currency mismatches (currently logged + marked failed)
- Stock release for abandoned/failed-payment checkouts (stock reserved at checkout creation)
- Admin UI for initiating refunds (API-ready, no UI)
- Invoices/GST, payment analytics, non-payment rate limiting
