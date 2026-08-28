# Phase 14 — Final Feature Audit

**Date:** 2026-08-26
**Scope:** Complete comparison of Legacy (Express+Handlebars) vs New (Next.js 15 + NestJS + Prisma + MySQL + JWT + Redis + BullMQ)

## Status Legend

| Status | Meaning |
|--------|---------|
| EXISTS | Feature exists in new codebase, unchanged |
| MIGRATED | Feature moved from legacy to new with same behavior |
| IMPROVED | Feature migrated with meaningful improvements |
| NEW | Feature did not exist in legacy, added in new |
| PARTIALLY IMPLEMENTED | Feature exists but incomplete |
| MISSING | Feature from legacy not present in new |
| BROKEN | Feature exists but does not work correctly |
| NOT REQUIRED | Legacy feature intentionally excluded |
| FUTURE | Planned for later implementation |

---

## 1. Master Feature Audit

### 1.1 Authentication

| Feature | Legacy | New | Status | Notes |
|---------|--------|-----|--------|-------|
| OTP-based login (email) | Brevo email, in-memory OTP, 5min TTL | Redis OTP, 5min TTL, Brevo queue | IMPROVED | Redis survives restarts |
| OTP generation | Math.random() | Math.random() | BROKEN | Should use crypto.randomInt() |
| OTP verification | In-memory Map | Redis with TTL | IMPROVED | |
| Email cookie (session) | 1-year httpOnly cookie | JWT access+refresh tokens | IMPROVED | Proper token-based auth |
| Logout | Clear email cookie | Revoke refresh token, clear cookies | IMPROVED | Server-side revocation |
| Password hashing | None (plaintext for sellers) | bcryptjs | IMPROVED | |
| Token expiry | Cookie lives 1 year | Access: configurable, Refresh: 7d | IMPROVED | |
| Refresh rotation | None | Yes, with revocation | NEW | |
| Role-based auth | None | CUSTOMER/SELLER/ADMIN via JWT claims | NEW | |
| Session persistence | Cookie survives restart | JWT + RefreshToken DB | IMPROVED | |

### 1.2 Pages — Public

| Page | Legacy Route | New Route | Status | Notes |
|------|-------------|-----------|--------|-------|
| Homepage | `/home` | `/` | MIGRATED | All 8 sections preserved |
| Login | `/login` | `/login` | MIGRATED | |
| OTP Verify | `POST /send-otp` → `verify.hbs` | `/verify` | MIGRATED | |
| Saree Category | `/saree-view` | `/saree` | MIGRATED | |
| Kurthi Category | `/kurthi-view` | `/kurthi` | MIGRATED | |
| Top Category | `/top-view` | `/top` | MIGRATED | |
| Leggin Category | `/leggin-view` | `/leggin` | MIGRATED | |
| Cosmetics Category | `/cosmetics-view` | `/cosmetics` | MIGRATED | |
| Product Detail | `/singlepro/:id` | `/product/[id]` | MIGRATED | |
| Search | `POST /search` | `/search` (GET) | IMPROVED | Now GET-based, debounced |
| Contact | `/contact` | `/contact` | MIGRATED | Static page |
| 404 | `/404` | Next.js `notFound()` | MIGRATED | |

### 1.3 Pages — Customer

| Page | Legacy Route | New Route | Status | Notes |
|------|-------------|-----------|--------|-------|
| Cart | `/cart` (cookie) | `/cart` (server-side) | IMPROVED | Server-side cart |
| Empty Cart | `emptycart.hbs` | Same route, conditional | MIGRATED | |
| Checkout (single) | `/buynow` → `newcheck.hbs` | `/checkout` | IMPROVED | Combined checkout |
| Checkout (cart) | `/cartbuynow` → `ccheckout.hbs` | `/checkout` | IMPROVED | Unified checkout |
| Payment (UPI) | `/upipayment` → `razorpay.hbs` | `/checkout` (inline Razorpay) | IMPROVED | No intermediate page |
| Payment (COD) | `/payment` with COD option | `/checkout` + COD confirm | IMPROVED | |
| Order Confirmation | `confirmation.hbs` | `/payment/success` | MIGRATED | |
| Order History | `/orders` | `/account/orders` | MIGRATED | |
| Order Detail | Not present | `/orders/[id]` | NEW | |
| Account | Not present | `/account` | NEW | |
| Profile | Not present | `/account/profile` | NEW | |
| Addresses | Not present | `/account/addresses` | NEW | |
| Wishlist | Not present | `/wishlist` | NEW | |
| My Reviews | Not present | `/account/reviews` | NEW | |
| Payment Success | N/A | `/payment/success` | MIGRATED | |
| Payment Failure | N/A | `/payment/failure` | NEW | |
| Confirmation | N/A | `/confirmation` | NEW | Orphaned page |

### 1.4 Pages — Seller

| Page | Legacy Route | New Route | Status | Notes |
|------|-------------|-----------|--------|-------|
| Seller Login | `/seller-login` | `/seller/login` | MIGRATED | |
| Seller Signup | `/seller-signup` | `/seller/signup` | MIGRATED | |
| Seller Dashboard | `/sellerhome` | `/seller/dashboard` | MIGRATED | |
| Seller Products | Part of `/sellerhome` | `/seller/products` | MIGRATED | |
| Add Product | `/addpro` | `/seller/add-product` | MIGRATED | |
| Edit Product | `/editthispro` → `editproduct.hbs` | `/seller/edit-product/[id]` | MIGRATED | |
| Seller Orders | Part of `/sellerhome` | `/seller/orders` | MIGRATED | |

### 1.5 Pages — Admin

| Page | Legacy Route | New Route | Status | Notes |
|------|-------------|-----------|--------|-------|
| Admin Hub | `/allmanagerpro` | `/admin/dashboard` | IMPROVED | Proper dashboard |
| Admin Products | Part of `/allmanagerpro` | `/admin/products` | MIGRATED | |
| Admin Orders | `/allordersofallmanagerpro` | `/admin/orders` | MIGRATED | |
| Admin Order Detail | N/A | `/admin/orders/[id]` | NEW | |
| Admin Users | Not present | `/admin/users` | NEW | |
| Admin Sellers | Not present | `/admin/sellers` | NEW | |
| Edit Order Status | `/editorderstatus` → `editstatus.hbs` | Inline status dropdown | IMPROVED | |
| Delete Product | `POST /delete` | Soft delete via API | IMPROVED | |
| Delete Order | `POST /deleteorder` | Delete via API | MIGRATED | |

---

## 2. Route Comparison

| Legacy Route | Next.js Route | Method | Status |
|-------------|---------------|--------|--------|
| `GET /` | `GET /` | GET | MIGRATED |
| `GET /home` | `GET /` | GET | MIGRATED |
| `GET /login` | `GET /login` | GET | MIGRATED |
| `POST /send-otp` | `POST /api/auth/send-otp` | POST | MIGRATED |
| `POST /verify-otp` | `POST /api/auth/verify-otp` | POST | MIGRATED |
| `GET /saree-view` | `GET /saree` | GET | MIGRATED |
| `GET /kurthi-view` | `GET /kurthi` | GET | MIGRATED |
| `GET /top-view` | `GET /top` | GET | MIGRATED |
| `GET /leggin-view` | `GET /leggin` | GET | MIGRATED |
| `GET /cosmetics-view` | `GET /cosmetics` | GET | MIGRATED |
| `GET /singlepro/:id` | `GET /product/[id]` | GET | MIGRATED |
| `GET /cart` | `GET /cart` | GET | IMPROVED |
| `POST /addcart` | `POST /api/cart` | POST | IMPROVED |
| `GET /removecart/:id/:size` | `DELETE /api/cart/:itemId` | DELETE | IMPROVED |
| `GET /clear-cart` | `DELETE /api/cart` | DELETE | MIGRATED |
| `POST /buynow` | `POST /api/checkout/buynow` | POST | IMPROVED |
| `POST /cartbuynow` | `POST /api/checkout/cartbuynow` | POST | IMPROVED |
| `POST /payment` | `POST /api/payments/cod/confirm` | POST | IMPROVED |
| `POST /upipayment` | `POST /api/payments/checkout` | POST | IMPROVED |
| `POST /cartpayment` | `POST /api/payments/verify` | POST | IMPROVED |
| `GET /orders` | `GET /api/orders` | GET | MIGRATED |
| `POST /search` | `GET /api/products/search` | GET | IMPROVED |
| `GET /contact` | `GET /contact` | GET | MIGRATED |
| `GET /seller-login` | `GET /seller/login` | GET | MIGRATED |
| `GET /seller-signup` | `GET /seller/signup` | GET | MIGRATED |
| `POST /seller-signup` | `POST /api/sellers/signup` | POST | MIGRATED |
| `POST /seller-login` | `POST /api/sellers/login` | POST | MIGRATED |
| `GET /sellerhome` | `GET /seller/dashboard` | GET | MIGRATED |
| `GET /addpro` | `GET /seller/add-product` | GET | MIGRATED |
| `POST /addpro` | `POST /api/products` | POST | MIGRATED |
| `POST /editthispro` | `GET /seller/edit-product/[id]` | GET | MIGRATED |
| `POST /editthispross/:id` | `PATCH /api/products/:id` | PATCH | MIGRATED |
| `POST /delete` | `DELETE /api/products/:id` | DELETE | IMPROVED |
| `GET /allmanagerpro` | `GET /admin/dashboard` | GET | IMPROVED |
| `GET /allordersofallmanagerpro` | `GET /admin/orders` | GET | MIGRATED |
| `POST /editorderstatus` | `PATCH /api/admin/orders/:id/status` | PATCH | IMPROVED |
| `POST /editstatuspro/:id` | `PATCH /api/admin/orders/:id/status` | PATCH | IMPROVED |
| `POST /deleteorder` | `DELETE /api/admin/orders/:id` | DELETE | MIGRATED |
| `GET /image/:id` | Static file serving `/image/*` | GET | MIGRATED |
| `GET /image1/:id` | Static file serving `/image/*` | GET | MIGRATED |
| `GET /health` | `GET /api/health` | GET | MIGRATED |
| `GET /clear-mail` | `POST /api/auth/logout` | POST | IMPROVED |
| — | `GET /account` | GET | NEW |
| — | `GET /account/profile` | GET | NEW |
| — | `GET /account/addresses` | GET | NEW |
| — | `GET /account/orders` | GET | NEW |
| — | `GET /account/reviews` | GET | NEW |
| — | `GET /orders/[id]` | GET | NEW |
| — | `GET /wishlist` | GET | NEW |
| — | `GET /payment/success` | GET | NEW |
| — | `GET /payment/failure` | GET | NEW |
| — | `GET /confirmation` | GET | NEW |
| — | `GET /admin/users` | GET | NEW |
| — | `GET /admin/sellers` | GET | NEW |
| — | `GET /admin/orders/[id]` | GET | NEW |
| — | `POST /api/auth/refresh` | POST | NEW |
| — | `GET /api/auth/me` | GET | NEW |
| — | `GET /api/reviews/*` | GET | NEW |
| — | `POST /api/reviews` | POST | NEW |
| — | `GET /api/wishlist` | GET | NEW |
| — | `POST /api/wishlist/toggle` | POST | NEW |
| — | `GET /api/coupons/*` | GET | NEW |
| — | `POST /api/coupons/*` | POST | NEW |
| — | `GET /api/inventory/*` | GET | NEW |
| — | `PUT /api/inventory/*` | PUT | NEW |
| — | `GET /api/sellers/dashboard` | GET | NEW |
| — | `GET /api/sellers/products` | GET | NEW |
| — | `GET /api/sellers/orders` | GET | NEW |
| — | `GET /api/admin/dashboard` | GET | NEW |
| — | `GET /api/admin/sellers` | GET | NEW |
| — | `GET /api/admin/users` | GET | NEW |
| — | `POST /api/payments/webhook` | POST | NEW |
| — | `POST /api/payments/retry` | POST | NEW |

---

## 3. API Audit

### 3.1 Legacy API Endpoints (from `server/router.js`)

| Legacy API | Method | Purpose | New API | Status |
|-----------|--------|---------|---------|--------|
| `POST /send-otp` | POST | Send OTP email | `POST /api/auth/send-otp` | MIGRATED |
| `POST /verify-otp` | POST | Verify OTP | `POST /api/auth/verify-otp` | MIGRATED |
| `POST /addcart` | POST | Add to cart | `POST /api/cart` | IMPROVED |
| `POST /buynow` | POST | Single buy | `POST /api/checkout/buynow` | IMPROVED |
| `POST /cartbuynow` | POST | Cart buy | `POST /api/checkout/cartbuynow` | IMPROVED |
| `POST /payment` | POST | COD payment | `POST /api/payments/cod/confirm` | IMPROVED |
| `POST /upipayment` | POST | Razorpay order | `POST /api/payments/checkout` | IMPROVED |
| `POST /cartpayment` | POST | Cart Razorpay | `POST /api/payments/verify` | IMPROVED |
| `POST /search` | POST | Search products | `GET /api/products/search` | IMPROVED |
| `POST /addpro` | POST | Create product | `POST /api/products` | MIGRATED |
| `POST /delete` | POST | Delete product | `DELETE /api/products/:id` | IMPROVED |
| `POST /editthispro` | POST | Get product for edit | `GET /api/sellers/products/:id` | MIGRATED |
| `POST /editthispross/:id` | POST | Update product | `PATCH /api/products/:id` | MIGRATED |
| `POST /seller-signup` | POST | Register seller | `POST /api/sellers/signup` | MIGRATED |
| `POST /seller-login` | POST | Login seller | `POST /api/sellers/login` | MIGRATED |
| `POST /editorderstatus` | POST | Get order for edit | `GET /api/admin/orders/:id` | MIGRATED |
| `POST /editstatuspro/:id` | POST | Update order status | `PATCH /api/admin/orders/:id/status` | MIGRATED |
| `POST /deleteorder` | POST | Delete order | `DELETE /api/admin/orders/:id` | MIGRATED |
| `GET /health` | GET | Health check | `GET /api/health` | MIGRATED |
| `GET /image/:id` | GET | Serve product image | Static `/image/*` | MIGRATED |
| `GET /image1/:id` | GET | Serve product image1 | Static `/image/*` | MIGRATED |

### 3.2 New-Only API Endpoints

| New API | Method | Purpose | Status |
|---------|--------|---------|--------|
| `POST /api/auth/refresh` | POST | Refresh JWT tokens | NEW |
| `GET /api/auth/me` | GET | Current user info | NEW |
| `POST /api/auth/logout` | POST | Logout (revoke tokens) | NEW |
| `GET /api/users/me` | GET | User profile | NEW |
| `PATCH /api/users/me` | PATCH | Update profile | NEW |
| `GET /api/users/addresses` | GET | List addresses | NEW |
| `POST /api/users/addresses` | POST | Create address | NEW |
| `PATCH /api/users/addresses/:id` | PATCH | Update address | NEW |
| `DELETE /api/users/addresses/:id` | DELETE | Delete address | NEW |
| `PATCH /api/users/addresses/:id/default` | PATCH | Set default address | NEW |
| `GET /api/products` | GET | List products (with filters) | NEW |
| `GET /api/products/homepage` | GET | Homepage data | NEW |
| `GET /api/products/admin/all` | GET | All products (seller/admin) | NEW |
| `POST /api/products/:id/restore` | POST | Restore soft-deleted product | NEW |
| `GET /api/categories` | GET | List categories | NEW |
| `GET /api/categories/:slug` | GET | Get category by slug | NEW |
| `GET /api/cart` | GET | Get cart | NEW |
| `PUT /api/cart/:itemId` | PUT | Update cart quantity | NEW |
| `GET /api/orders/:id` | GET | Order detail | NEW |
| `GET /api/orders/:id/history` | GET | Order status history | NEW |
| `POST /api/orders/:id/cancel` | POST | Cancel order | NEW |
| `POST /api/payments/retry` | POST | Retry failed payment | NEW |
| `GET /api/payments/:id/status` | GET | Payment status check | NEW |
| `POST /api/payments/webhook` | POST | Razorpay webhook | NEW |
| `POST /api/reviews` | POST | Create review | NEW |
| `GET /api/reviews/product/:id` | GET | Product reviews | NEW |
| `GET /api/reviews/my` | GET | My reviews | NEW |
| `PATCH /api/reviews/:id` | PATCH | Update review | NEW |
| `DELETE /api/reviews/:id` | DELETE | Delete review | NEW |
| `PATCH /api/reviews/:id/moderate` | PATCH | Moderate review | NEW |
| `GET /api/wishlist` | GET | Get wishlist | NEW |
| `POST /api/wishlist/toggle` | POST | Toggle wishlist item | NEW |
| `DELETE /api/wishlist` | DELETE | Clear wishlist | NEW |
| `POST /api/coupons/validate` | POST | Validate coupon | NEW |
| `POST /api/coupons/apply` | POST | Apply coupon | NEW |
| `GET /api/inventory/:productId` | GET | Get stock info | NEW |
| `PUT /api/inventory/:productId` | PUT | Update stock | NEW |
| `GET /api/sellers/dashboard` | GET | Seller dashboard data | NEW |
| `GET /api/sellers/products` | GET | Seller's products | NEW |
| `GET /api/sellers/orders` | GET | Seller's orders | NEW |
| `PUT /api/sellers/profile` | PUT | Update seller profile | NEW |
| `GET /api/admin/dashboard` | GET | Admin dashboard data | NEW |
| `GET /api/admin/sellers` | GET | All sellers | NEW |
| `PUT /api/admin/sellers/:id/status` | PUT | Toggle seller status | NEW |
| `PUT /api/admin/sellers/:id/role` | PUT | Change seller role | NEW |
| `GET /api/admin/users` | GET | All users | NEW |
| `GET /api/admin/users/:id` | GET | User detail | NEW |
| `PUT /api/admin/users/:id/role` | PUT | Change user role | NEW |

---

## 4. Frontend Function Audit

### 4.1 Buttons & Interactive Elements

| Element | Location | Handler | API | Backend | DB | UI Update | Status |
|---------|----------|---------|-----|---------|-----|-----------|--------|
| "View Collection" hero | Homepage | Link → /saree | — | — | — | — | EXISTS |
| Category "View All" | Homepage | Link → category | — | — | — | — | EXISTS |
| "Add to Cart" | Product detail | onClick → POST /cart | cartApi.add | CartService | CartItem | Redirect to /cart | EXISTS |
| "Buy Now" | Product detail | onClick → checkout store | — | — | — | Navigate to /checkout | EXISTS |
| Quantity +/- | Cart | onClick → PUT /cart/:id | cartApi.update | CartService | CartItem | Refetch cart | EXISTS |
| "Remove" | Cart | onClick → DELETE /cart/:id | cartApi.remove | CartService | CartItem | Refetch cart | EXISTS |
| "Proceed to Checkout" | Cart | onClick → checkout store | — | — | — | Navigate to /checkout | EXISTS |
| "Place Order" (COD) | Checkout | onSubmit → paymentsApi.confirmCod | paymentsApi | PaymentsService | Order+Payment | Navigate /payment/success | EXISTS |
| "Pay Now" (UPI) | Checkout | onSubmit → Razorpay SDK | paymentsApi.verify | PaymentsService | Order+Payment | Navigate /payment/success | EXISTS |
| "Retry Payment" | Payment failure | onClick → /checkout | — | — | — | Navigate to /checkout | EXISTS |
| "View Orders" | Success/failure | Link → /orders | — | — | — | — | EXISTS |
| Wishlist toggle | Product detail (client) | onClick → wishlistApi.toggle | wishlistApi | WishlistService | WishlistItem | Refetch | PARTIALLY IMPLEMENTED |
| Review submit | Product detail | onSubmit → reviewsApi.create | reviewsApi | ReviewsService | Review | Refetch | PARTIALLY IMPLEMENTED |
| Search | Header | Debounced → GET /products/search | productService | ProductsService | Product | Display results | EXISTS |
| "Save Changes" | Account profile | onSubmit → usersApi.updateProfile | usersApi | UsersService | User | Update Zustand | EXISTS |
| Address CRUD | Account addresses | Multiple → usersApi | usersApi | UsersService | Address | Refetch | EXISTS |
| Delete Review | Account reviews | onClick → reviewsApi.delete | reviewsApi | ReviewsService | Review | Refetch | EXISTS |
| Seller "Delete" | Seller products | onClick → hardcoded localhost URL | BROKEN | — | — | — | BROKEN |
| Seller "Restore" | Seller products | onClick → hardcoded localhost URL | BROKEN | — | — | — | BROKEN |
| Admin status update | Admin orders | onClick → hardcoded localhost URL | BROKEN | — | — | — | BROKEN |
| Seller status dropdown | Seller orders | onChange → sellerOrdersApi | sellerOrdersApi | OrdersService | Order | Refetch | EXISTS |
| Admin status dropdown | Admin order detail | onChange → adminOrdersApi | adminOrdersApi | OrdersService | Order | Refetch | EXISTS |

### 4.2 Issues Found

| Issue | Severity | Location | Description |
|-------|----------|----------|-------------|
| `alert()` usage | MEDIUM | `checkout/page.tsx:203` | Uses native `alert()` instead of sonner toast |
| `confirm()` usage | LOW | Multiple pages | Inconsistent with toast-based UX |
| Hardcoded localhost URLs | HIGH | `seller/products/page.tsx:23,32,48` | Bypasses ApiClient, breaks in production |
| Hardcoded localhost URL | HIGH | `admin/orders/page.tsx:36` | Bypasses ApiClient, breaks in production |
| `paymentsApi.getStatus(0)` | CRITICAL | `payment/success/page.tsx:19` | Always passes 0, payment status never verified |
| `paymentsApi.retry(0)` | CRITICAL | `payment/failure/page.tsx:20` | Always passes 0, retry broken |
| Unused product-detail-client | LOW | `product/[id]/product-detail-client.tsx` | Richer component exists but is unused |
| Unused useUIStore | LOW | `store/index.ts` | Defined but never imported |
| Unused server-product.service | LOW | `services/server-product.service.ts` | Never imported |

---

## 5. Form Audit

### 5.1 Login Form (`/login`)

| Aspect | Status | Notes |
|--------|--------|-------|
| Fields | EXISTS | email |
| Validation | EXISTS | Zod email validation |
| Loading | EXISTS | Button disabled during submit |
| Submission | EXISTS | POST /auth/send-otp |
| Error handling | EXISTS | Toast on error |
| Success handling | EXISTS | Navigate to /verify |

### 5.2 OTP Verify Form (`/verify`)

| Aspect | Status | Notes |
|--------|--------|-------|
| Fields | EXISTS | OTP (6 digits) |
| Validation | EXISTS | Zod string.length(6) |
| Loading | EXISTS | Button disabled during submit |
| Submission | EXISTS | POST /auth/verify-otp |
| Error handling | EXISTS | Toast on error |
| Success handling | EXISTS | Set user, navigate to / |

### 5.3 Checkout Form (`/checkout`)

| Aspect | Status | Notes |
|--------|--------|-------|
| Fields | EXISTS | name, email, phone, address, pincode, district, landmark |
| Validation | EXISTS | Zod with required fields |
| Loading | EXISTS | Button disabled during submit |
| Submission | EXISTS | POST /payments/checkout then COD/UPI |
| Error handling | PARTIAL | alert() used for payment errors (should be toast) |
| Success handling | EXISTS | Navigate to /payment/success |
| Redirect | EXISTS | To success/failure pages |
| Database update | EXISTS | Order + Payment created |

### 5.4 Product Create Form (`/seller/add-product`)

| Aspect | Status | Notes |
|--------|--------|-------|
| Fields | EXISTS | name, price, mrp, description, ptype, size stocks, images |
| Validation | EXISTS | Zod schema |
| Loading | EXISTS | Button disabled during submit |
| Submission | EXISTS | POST /products (FormData) |
| Error handling | EXISTS | Toast on error |
| Success handling | EXISTS | Navigate to /seller/products |
| File upload | EXISTS | Multiple images with validation |

### 5.5 Product Edit Form (`/seller/edit-product/[id]`)

| Aspect | Status | Notes |
|--------|--------|-------|
| Fields | EXISTS | Same as create, pre-populated |
| Validation | EXISTS | Zod schema |
| Loading | EXISTS | Button disabled during submit |
| Submission | EXISTS | PATCH /products/:id (FormData or JSON) |
| Error handling | EXISTS | Toast on error |
| Success handling | EXISTS | Navigate to /seller/products |
| Current images | EXISTS | Displayed, new images optional |

### 5.6 Address Form (`/account/addresses`)

| Aspect | Status | Notes |
|--------|--------|-------|
| Fields | EXISTS | name, phone, address, pincode, district, landmark, isDefault |
| Validation | EXISTS | Zod schema |
| Loading | EXISTS | Button disabled during submit |
| Submission | EXISTS | POST/PATCH /users/addresses |
| Error handling | EXISTS | Toast on error |
| Success handling | EXISTS | Refetch addresses |
| CRUD | EXISTS | Create, Update, Delete, Set Default |

### 5.7 Review Form (Product detail)

| Aspect | Status | Notes |
|--------|--------|-------|
| Fields | EXISTS | rating (stars), title, comment |
| Validation | EXISTS | react-hook-form |
| Loading | EXISTS | Button disabled during submit |
| Submission | EXISTS | POST /reviews |
| Error handling | EXISTS | Toast on error |
| Success handling | EXISTS | Refetch reviews |

### 5.8 Seller Signup Form

| Aspect | Status | Notes |
|--------|--------|-------|
| Fields | EXISTS | name, mobile, email, password, confirmPassword |
| Validation | EXISTS | Zod with password match |
| Loading | EXISTS | Button disabled during submit |
| Submission | EXISTS | POST /sellers/signup |
| Error handling | EXISTS | Toast on error |
| Success handling | EXISTS | Navigate to /seller/login |

### 5.9 Seller Login Form

| Aspect | Status | Notes |
|--------|--------|-------|
| Fields | EXISTS | mobile, password |
| Validation | EXISTS | Zod (10+ digits, 4+ chars) |
| Loading | EXISTS | Button disabled during submit |
| Submission | EXISTS | POST /sellers/login |
| Error handling | EXISTS | Toast on error |
| Success handling | EXISTS | Store token, navigate to /seller/dashboard |

---

## 6. Authentication Audit

| Aspect | Legacy | New | Status |
|--------|--------|-----|--------|
| Signup mechanism | OTP only (email) | OTP only (email) | MIGRATED |
| Login mechanism | OTP only (email) | OTP only (email) | MIGRATED |
| OTP generation | Math.random() (6-digit) | Math.random() (6-digit) | BROKEN |
| OTP storage | In-memory Map (lost on restart) | Redis with TTL | IMPROVED |
| OTP expiry | 5 minutes | 5 minutes | MIGRATED |
| OTP max attempts | 3 | 5 | IMPROVED |
| Session mechanism | Cookie (email) for customers, Cookie (smobile) for sellers | JWT access+refresh tokens | IMPROVED |
| Token storage | httpOnly cookies | httpOnly cookies (customers) + localStorage (sellers) | PARTIALLY IMPLEMENTED |
| Token expiry | 1 year | Access: 15min, Refresh: 7d | IMPROVED |
| Refresh rotation | None | Yes | NEW |
| Logout | Clear cookie | Revoke refresh token + clear cookies | IMPROVED |
| Password handling | Plaintext (sellers) | bcryptjs hashed | IMPROVED |
| Role assignment | None | JWT claims (CUSTOMER/SELLER/ADMIN) | NEW |
| Unauthorized redirect | Only /orders checks | Middleware redirects to /login | IMPROVED |

---

## 7. JWT Audit

| Aspect | Status | Notes |
|--------|--------|-------|
| Access token | EXISTS | Signed with JWT_ACCESS_SECRET |
| Refresh token | EXISTS | Signed with JWT_REFRESH_SECRET, stored in DB |
| Token expiration | EXISTS | Access: configurable, Refresh: 7 days |
| Refresh rotation | EXISTS | Old token revoked on use |
| Logout | EXISTS | Refresh token revoked, cookies cleared |
| Cookie security | PARTIAL | httpOnly: true, sameSite: lax, secure: only in production |
| Role claims | EXISTS | role in JWT payload |
| User identity | EXISTS | sub: userId/email in JWT |
| **Weak fallback secrets** | BROKEN | Falls back to 'access-secret' if env missing |
| **OTP uses Math.random()** | BROKEN | Not cryptographically secure |
| **Seller tokens in response body** | BROKEN | Tokens returned in JSON body, not just cookies |

---

## 8. Role Audit

### 8.1 Access Matrix

| Resource | CUSTOMER | SELLER | ADMIN | UNAUTH |
|----------|----------|--------|-------|--------|
| Public pages (home, products, search) | ALLOW | ALLOW | ALLOW | ALLOW |
| Customer pages (cart, checkout, orders, account) | ALLOW | DENY | DENY | REDIRECT |
| Wishlist | ALLOW | DENY | DENY | DENY |
| Reviews (create/edit own) | ALLOW | DENY | DENY | DENY |
| Seller login/signup | ALLOW | ALLOW | ALLOW | ALLOW |
| Seller dashboard/products | DENY | ALLOW (own) | DENY | DENY |
| Seller orders | DENY | ALLOW (own) | DENY | DENY |
| Admin dashboard | DENY | DENY | ALLOW | DENY |
| Admin products/orders/users/sellers | DENY | DENY | ALLOW | DENY |

### 8.2 Issues

| Issue | Severity | Description |
|-------|----------|-------------|
| No middleware for /seller/* | HIGH | Any user (or unauthenticated) can access seller pages |
| No middleware for /admin/* | HIGH | Any user (or unauthenticated) can access admin pages |
| OwnershipGuard for products | EXISTS | Sellers can only modify own products |
| OwnershipGuard for orders | EXISTS | Sellers can only view/modify own orders |

---

## 9. Product Audit

| Field | Legacy | New | Status |
|-------|--------|-----|--------|
| name | VARCHAR(100) | String | MIGRATED |
| price | INT | Int | MIGRATED |
| mrp | INT | Int | MIGRATED |
| description | TEXT | String | MIGRATED |
| ptype (category) | VARCHAR(100) | String (.VarChar(100)) | MIGRATED |
| image | LONGBLOB/path | String | IMPROVED |
| image1-image4 | LONGBLOB/path | String | IMPROVED |
| size_s | INT | Int (sizeS) | MIGRATED |
| size_m | INT | Int (sizeM) | MIGRATED |
| size_l | INT | Int (sizeL) | MIGRATED |
| size_xl | INT | Int (sizeXl) | MIGRATED |
| size_xxl | INT | Int (sizeXxl) | MIGRATED |
| quantity | INT (legacy) | Computed from sizes | IMPROVED |
| sellerId | Not present | Int (FK) | NEW |
| deletedAt | Not present | DateTime? | NEW |
| createdAt | Not present | DateTime @default(now()) | NEW |
| updatedAt | Not present | DateTime @updatedAt | NEW |

| Operation | Legacy | New | Status |
|-----------|--------|-----|--------|
| Create | POST /addpro (multipart) | POST /api/products (FormData) | MIGRATED |
| Read (list) | GET with SQL | GET /api/products (with filters, pagination) | IMPROVED |
| Read (single) | GET /singlepro/:id | GET /api/products/:id | MIGRATED |
| Update | POST /editthispross/:id | PATCH /api/products/:id | MIGRATED |
| Delete | POST /delete (hard) | DELETE /api/products/:id (soft) | IMPROVED |
| Search | POST /search (LIKE) | GET /api/products/search | IMPROVED |
| Category filter | GET /saree-view etc. | GET /api/products?category=X | MIGRATED |
| Pagination | None | Page/limit params | NEW |
| Sorting | ORDER BY price DESC/ASC | Sort param (price_asc, price_desc) | IMPROVED |
| Filtering | Hardcoded per route | Category, price range, inStock | IMPROVED |

---

## 10. Cart Audit

| Aspect | Legacy | New | Status |
|--------|--------|-----|--------|
| Storage | Cookie (string format) | Server-side (CartItem table) | IMPROVED |
| Add item | POST /addcart | POST /api/cart | IMPROVED |
| Update quantity | Not supported | PUT /api/cart/:itemId | NEW |
| Remove item | GET /removecart/:id/:size | DELETE /api/cart/:itemId | IMPROVED |
| Clear cart | GET /clear-cart | DELETE /api/cart | MIGRATED |
| Quantity limit | Stock check | Stock check | MIGRATED |
| Size support | Yes (cookie key: id-size) | Yes (size field in CartItem) | MIGRATED |
| Persistence | Cookie (survives restart) | DB (survives restart) | IMPROVED |
| Login requirement | None (cookie works without login) | Required (server-side cart) | CHANGED |
| Duplicate item | Quantity increment | Quantity increment (unique constraint) | MIGRATED |
| Buy Now vs Cart | Separate forms | Zustand store mode + unified checkout | IMPROVED |

---

## 11. Checkout Audit

| Aspect | Legacy | New | Status |
|--------|--------|-----|--------|
| Cart → Address → Pricing → Payment | Linear form | Unified checkout form | IMPROVED |
| Address fields | username, email, address, pincode, district, landmark | name, email, phone, address, pincode, district, landmark | IMPROVED |
| Coupon support | Not present | Coupon validate + apply | NEW |
| Pricing recalculation | Client-side (manipulable) | Server-side (authoritative) | IMPROVED |
| Stock validation | Client-side | Server-side (in checkout service) | IMPROVED |
| Price manipulation | Possible (client sends total) | Server recalculates from DB | IMPROVED |
| Tax calculation | Not present | Server-side | NEW |
| Shipping calculation | Not present | Server-side | NEW |

---

## 12. Payment Audit

| Aspect | Legacy | New | Status |
|--------|--------|-----|--------|
| Razorpay order creation | Server-side | Server-side | MIGRATED |
| UPI payment | Client SDK | Client SDK | MIGRATED |
| COD option | Yes | Yes | MIGRATED |
| Payment verification | NONE (assumed success) | Signature verification | IMPROVED |
| Webhook | Not present | POST /api/payments/webhook | NEW |
| Webhook signature verification | N/A | BROKEN (bypassed if missing) | BROKEN |
| Payment status tracking | Not present | Payment table with status | NEW |
| Retry payment | Not present | POST /api/payments/retry | NEW |
| Payment status check | Not present | GET /api/payments/:id/status | NEW |
| Failure page | Not present | /payment/failure | NEW |
| Success page | confirmation.hbs | /payment/success | MIGRATED |

---

## 13. Order Audit

| Aspect | Legacy | New | Status |
|--------|--------|-----|--------|
| Order creation | POST /payment | POST /api/payments/checkout | MIGRATED |
| Order items | Single item per order | Single item per order | MIGRATED |
| Historical price | Stored in orders table | Stored in orders table | MIGRATED |
| Historical address | Stored in orders table | Stored in orders table | MIGRATED |
| Payment status | Not tracked | PaymentStatus enum | NEW |
| Order status | Free-form VARCHAR | OrderStatus enum (7 states) | IMPROVED |
| Status history | Not present | OrderStatusHistory table | NEW |
| Order list | /orders (join with products) | GET /api/orders | MIGRATED |
| Order detail | Not present | GET /api/orders/:id | NEW |
| Cancel order | Not present | POST /api/orders/:id/cancel | NEW |
| Tracking | Not present | ShippedAt, DeliveredAt, Carrier, TrackingNumber, TrackingUrl | NEW |
| Seller orders | Not present | GET /api/seller/orders | NEW |
| Admin orders | GET /allordersofallmanagerpro | GET /api/admin/orders | MIGRATED |

---

## 14. Inventory Audit

| Aspect | Legacy | New | Status |
|--------|--------|-----|--------|
| Stock per size | size_s/m/l/xl/xxl columns | sizeS/M/L/Xl/Xxl fields | MIGRATED |
| Stock decrease on purchase | Yes (UPDATE SET col = col - qty) | Yes (Prisma decrement) | MIGRATED |
| Stock increase on cancellation | Not present | Not present | NOT REQUIRED |
| Stock increase on return | Not present | Not present | NOT REQUIRED |
| Concurrent purchase safety | None (race condition possible) | Transaction-based | IMPROVED |
| Out-of-stock check | Total of all sizes > 0 | Stock validation in service | MIGRATED |
| Size-specific stock | Yes | Yes | MIGRATED |
| Stock never negative | Not enforced | Prisma validation | IMPROVED |
| Manual stock update | Not present | PUT /api/inventory/:productId | NEW |

---

## 15. Seller Audit

| Feature | Legacy | New | Status |
|---------|--------|-----|--------|
| Login | POST /seller-login | POST /api/sellers/login | MIGRATED |
| Signup | POST /seller-signup | POST /api/sellers/signup | MIGRATED |
| Dashboard | GET /sellerhome | GET /api/sellers/dashboard | IMPROVED |
| Products list | Part of sellerhome | GET /api/sellers/products | MIGRATED |
| Add product | GET /addpro → POST /addpro | POST /api/products | MIGRATED |
| Edit product | POST /editthispro → /editthispross/:id | PATCH /api/products/:id | MIGRATED |
| Delete product | POST /delete | DELETE /api/products/:id | IMPROVED |
| Image upload | Multer + Sharp | Multer + Sharp (ImageService) | MIGRATED |
| Inventory | Not present | PUT /api/inventory/:productId | NEW |
| Orders | Not present | GET /api/seller/orders | NEW |
| Status update | Not present | PATCH /api/seller/orders/:id/status | NEW |
| Ownership enforcement | None | OwnershipGuard | NEW |
| Profile update | Not present | PUT /api/sellers/profile | NEW |

---

## 16. Admin Audit

| Feature | Legacy | New | Status |
|---------|--------|-----|--------|
| Dashboard | GET /allmanagerpro (basic) | GET /api/admin/dashboard (stats) | IMPROVED |
| Products view | Part of allmanagerpro | GET /api/admin/products | MIGRATED |
| Orders view | GET /allordersofallmanagerpro | GET /api/admin/orders | MIGRATED |
| Order detail | Not present | GET /api/admin/orders/:id | NEW |
| Status update | POST /editstatuspro/:id | PATCH /api/admin/orders/:id/status | MIGRATED |
| Delete product | POST /delete | Soft delete | IMPROVED |
| Delete order | POST /deleteorder | DELETE /api/admin/orders/:id | MIGRATED |
| Users management | Not present | GET /api/admin/users | NEW |
| User role change | Not present | PUT /api/admin/users/:id/role | NEW |
| Sellers management | Not present | GET /api/admin/sellers | NEW |
| Seller status toggle | Not present | PUT /api/admin/sellers/:id/status | NEW |
| Seller role change | Not present | PUT /api/admin/sellers/:id/role | NEW |
| Auth protection | NONE (publicly accessible) | JwtAuthGuard + RolesGuard(ADMIN) | IMPROVED |

---

## 17. Customer Account Audit

| Feature | Legacy | New | Status |
|---------|--------|-----|--------|
| Profile | Not present | GET/PATCH /api/users/me | NEW |
| Addresses | Not present | Full CRUD /api/users/addresses | NEW |
| Orders | GET /orders | GET /api/orders | MIGRATED |
| Wishlist | Not present | GET/POST/DELETE /api/wishlist | NEW |
| Reviews | Not present | CRUD /api/reviews | NEW |
| Logout | GET /clear-mail | POST /api/auth/logout | IMPROVED |

---

## 18. Email Audit

| Event | Legacy | New | Status |
|-------|--------|-----|--------|
| OTP email | Brevo API | Brevo API via BullMQ | IMPROVED |
| Order confirmation email | Not present | BullMQ email queue | NEW |
| Order status update email | Not present | BullMQ email queue | NEW |
| Order cancellation email | Not present | BullMQ email queue | NEW |
| Welcome email | Not present | Not present | NOT REQUIRED |

---

## 19. Notification Audit

| Type | Legacy | New | Status |
|------|--------|-----|--------|
| Customer notifications | None | Notification model + BullMQ | NEW |
| Seller notifications | None | Notification model + BullMQ | NEW |
| Admin notifications | None | Notification model + BullMQ | NEW |
| Email notifications | OTP only | OTP + order lifecycle | IMPROVED |
| In-app notifications | None | Notification model | NEW |
| Toast notifications | None | sonner toasts | NEW |

---

## 20. Database Audit

See separate `docs/DATABASE-MIGRATION-MATRIX.md` for complete table/field comparison.

| Legacy Table | New Model | Status |
|-------------|-----------|--------|
| products | Product | MIGRATED |
| orders | Order | MIGRATED |
| seller | Seller | MIGRATED |
| cust | User | REPLACED |
| — | RefreshToken | NEW |
| — | CartItem | NEW |
| — | Address | NEW |
| — | Review | NEW |
| — | WishlistItem | NEW |
| — | Coupon | NEW |
| — | CouponUsage | NEW |
| — | Payment | NEW |
| — | AuditLog | NEW |
| — | OrderStatusHistory | NEW |
| — | ReturnRequest | NEW |
| — | Refund | NEW |
| — | Notification | NEW |
| — | NotificationPreference | NEW |
| — | SiteConfig | NEW |

---

## 21. Content Audit

| Content | Legacy | New | Status |
|---------|--------|-----|--------|
| Brand name "Beauty Queen" | Yes | Yes | SAME |
| Category names | saree, kurthi, top, leggin, cosmetics | saree, kurthi, top, leggin, cosmetics | SAME |
| Contact page info | Static content | Static content | SAME |
| Footer links | Category links, quick links | Category links, quick links | SAME |
| Logo | ThemeFisher theme | Custom (needs image) | CHANGED |
| Product images | public/image/*.webp | Same path served statically | SAME |
| Meta title | BigSale theme title | "Beauty Queen" | CHANGED |
| Meta description | Theme default | Custom SEO | IMPROVED |

---

## 22. Image Audit

| Aspect | Legacy | New | Status |
|--------|--------|-----|--------|
| Product images | public/image/{id}-{idx}.webp | Same path, static serving | MIGRATED |
| Image processing | Sharp 800px WebP q80 | Sharp 800x1000 WebP (cover) | IMPROVED |
| Image display | `<img>` tags | `<img>` tags (not Next.js Image) | PARTIALLY IMPLEMENTED |
| Image validation | None | MIME type + size validation | NEW |
| Max images | 5 | 5 | MIGRATED |
| Placeholder for null | None | Placeholder image | NEW |

---

## 23. Business Logic Audit

| Logic | Legacy | New | Status |
|-------|--------|-----|--------|
| Stock available = sum of sizes | Yes | Yes | MIGRATED |
| Per-size stock check on add to cart | Yes | Yes | MIGRATED |
| Stock decrement on order | Yes (after insert) | Yes (transaction) | IMPROVED |
| Price = DB value (not client) | Client sends total | Server recalculates | IMPROVED |
| Cart total = sum of items | Client-side | Server-side | IMPROVED |
| Search = LIKE %term% | Yes | Yes | MIGRATED |
| Categories hardcoded | 5 types | 5 types (config package) | MIGRATED |
| Order default status "Pending" | Yes | Yes | MIGRATED |
| Order status free-form | Any string | Enum (7 values) | IMPROVED |

---

## 24. Hidden Features

| Feature | Legacy | New | Status |
|---------|--------|-----|--------|
| Health check | GET /health | GET /api/health | MIGRATED |
| Swagger docs | Not present | /api/docs | NEW |
| Audit logging | Not present | AuditLog model + AuditService | NEW |
| BullMQ queues | Not present | email, image-processing, notifications | NEW |
| Redis caching | Not present | RedisService with fallback | NEW |
| Soft delete (products) | Hard delete | deletedAt field | NEW |
| Order status history | Not present | OrderStatusHistory model | NEW |

---

## 25. Cron/Automation Audit

| Feature | Legacy | New | Status |
|---------|--------|-----|--------|
| Cron jobs | None | @nestjs/schedule imported | NEW |
| Scheduled tasks | None | Module imported but no cron decorators found | PARTIALLY IMPLEMENTED |
| Background jobs | None | BullMQ processors (email, image, notification) | NEW |
| Auto status updates | None | None | NOT REQUIRED |

---

## 26. External Service Audit

| Service | Legacy | New | Status |
|---------|--------|-----|--------|
| Razorpay | razorpay.orders.create | razorpay.orders.create + verification + webhook | IMPROVED |
| Brevo | sendTransacEmail (OTP) | BullMQ queue → sendTransacEmail (OTP + order lifecycle) | IMPROVED |
| Sharp | Image resize | Image resize with validation | MIGRATED |
| MySQL | Raw mysql2 queries | Prisma ORM | IMPROVED |
| Redis | Not present | ioredis + in-memory fallback | NEW |
| BullMQ | Not present | email, image-processing, notifications queues | NEW |

---

## 27. Security Audit

See separate `docs/FINAL-SECURITY-AUDIT.md` for complete findings.

| Category | Status |
|----------|--------|
| Authentication | IMPROVED (JWT vs cookies) |
| Authorization | IMPROVED (role-based guards) |
| JWT | PARTIALLY IMPLEMENTED (weak fallback secrets) |
| Cookies | IMPROVED (httpOnly, sameSite) |
| CORS | EXISTS (configurable) |
| CSRF | MISSING (no protection) |
| XSS | PARTIALLY (Helmet CSP disabled) |
| SQL injection | IMPROVED (Prisma ORM) |
| File uploads | EXISTS (validation + size limits) |
| Rate limits | MISSING (no throttling) |
| Secrets | PARTIALLY (some hardcoded, fallback defaults) |
| Payment | PARTIALLY (webhook verification broken) |
| Webhooks | BROKEN (signature bypass) |

---

## 28. Performance Audit

| Issue | Severity | Location | Description |
|-------|----------|----------|-------------|
| N+1 product queries in cart/checkout | HIGH | payments.service.ts, checkout.service.ts | Product lookup per cart item in loop |
| No pagination on list endpoints | HIGH | orders, products, users, reviews | All `findMany` with no limit |
| Missing DB indexes | HIGH | products (ptype, price, deletedAt) | Full table scans on common queries |
| Raw `<img>` instead of `<Image>` | MEDIUM | 11 instances across app/ | No lazy loading, no optimization |
| 9 homepage queries | MEDIUM | products.service.ts | Could be consolidated |
| bcrypt loop in refresh validation | MEDIUM | auth.service.ts | CPU-intensive per token |

---

## 29. SEO Audit

| Aspect | Status | Notes |
|--------|--------|-------|
| Metadata | EXISTS | Title template, description, keywords |
| Open Graph | EXISTS | Per-page OpenGraph metadata |
| Canonical | MISSING | No canonical URLs |
| Sitemap | EXISTS | /sitemap.xml generated |
| Robots | EXISTS | /robots.txt generated |
| Product structured data | MISSING | No JSON-LD schema |
| Product meta (noindex) | MISSING | Private pages (account, cart) not blocked |

---

## 30. Mobile Audit

| Aspect | Status | Notes |
|--------|--------|-------|
| Responsive layout | EXISTS | Tailwind responsive breakpoints |
| Mobile navbar | EXISTS | Hamburger menu |
| Product grid responsive | EXISTS | Grid adapts to screen width |
| Forms mobile-friendly | EXISTS | Full-width inputs |
| Tables mobile-friendly | PARTIAL | DataTable has horizontal scroll |
| Touch-friendly buttons | EXISTS | Adequate tap targets |

---

## 31. Accessibility Audit

| Aspect | Status | Notes |
|--------|--------|-------|
| Keyboard navigation | PARTIAL | No skip-to-content link |
| Focus management | PARTIAL | Default browser focus |
| Labels | EXISTS | All form fields have labels |
| Alt text | MISSING | Product images use product name |
| ARIA attributes | PARTIAL | Some present on Radix components |
| Contrast | EXISTS | Tailwind default contrast ratios |
| Modal behavior | EXISTS | Radix Dialog handles focus trapping |

---

## 32. TypeScript Audit

| Category | Count | Notes |
|----------|-------|-------|
| `any` types | 132 | Scattered across API and frontend |
| `@ts-ignore` | 0 | Clean |
| `@ts-nocheck` | 0 | Clean |
| `eslint-disable` | 1 | Redis service require import |

---

## 33. Console/Debug Audit

| Category | Count | Notes |
|----------|-------|-------|
| console.log | 18 | Mostly in test/seed files |
| console.error | 4 | Seed script + error boundary |
| console.warn | 0 | Clean |
| debugger | 0 | Clean |
| alert() | 1 | checkout/page.tsx (should be toast) |

---

## 34. TODO Audit

| Category | Count | Notes |
|----------|-------|-------|
| TODO | 0 | Clean |
| FIXME | 0 | Clean |
| HACK | 0 | Clean |
| TEMP | 0 | Clean |
| COMING SOON | 0 | Clean |
| Not implemented | 0 | Clean |

---

## 35. Dead Code Audit

| File | Status | Notes |
|------|--------|-------|
| `product-detail-client.tsx` | DEAD | Richer component, never imported |
| `server-product.service.ts` | DEAD | Server-side service, never imported |
| `useUIStore` | DEAD | Store defined but never used |
| `OrderDashboard` type | DEAD | Type defined but never used |
| `checkoutApi.buyNow/cartBuyNow` | DEAD | Defined but never called |
| `paymentsApi.createRazorpayOrder/process` | DEAD | Defined but never called |
| `ordersApi.all/delete/dashboard` | DEAD | Defined but never called |
| `sellersApi.me/profile/updateProfile` | DEAD | Defined but never called |
| `sellerApi.orders/order/updateOrderStatus` | DEAD | Defined but never called |
| `adminApi.seller/updateSellerRole/user` | DEAD | Defined but never called |
| `reviewsApi.canReview/update/moderate` | DEAD | Defined but never called |
| `usersApi.getAddress` | DEAD | Defined but never called |
| `inventoryApi` (entire module) | DEAD | Never called from frontend |
| `confirmation/page.tsx` | ORPHANED | Page exists but never navigated to |
| `apps/api/create-test-img.js` | DEV | Test file in production |
| `apps/api/start-debug.js` | DEV | Debug file in production |
| `apps/api/test-upload.js` | DEV | Test file in production |

---

## 36. Environment Variable Audit

| Variable | Legacy | New | Status |
|----------|--------|-----|--------|
| DB_HOST/DB_USER/DB_PASS/DB_NAME | server/.env | DATABASE_URL (Prisma) | MIGRATED |
| JWT_SECRET | backend/.env | JWT_ACCESS_SECRET + JWT_REFRESH_SECRET | IMPROVED |
| EMAIL_USER/EMAIL_PASS | server/.env | Removed (Brevo used) | REPLACED |
| RAZORPAY_KEY_ID/SECRET | Both | Same + WEBHOOK_SECRET | IMPROVED |
| BREVO_API_KEY | Both | Same | MIGRATED |
| REDIS_HOST/PORT | N/A | New | NEW |
| PORT | 4000 | 5000 | CHANGED |
| LOG_LEVEL | N/A | New (Pino) | NEW |
| FRONTEND_URL | Both | Same | MIGRATED |
| NEXT_PUBLIC_API_URL | frontend/.env.local | apps/web/.env.local | MIGRATED |

---

## 37. Dependency Audit

### Key Dependencies (apps/api)

| Package | Version | Purpose |
|---------|---------|---------|
| @nestjs/core | ^10.x | Framework |
| @prisma/client | 5.x | ORM |
| @nestjs/jwt | ^10.x | JWT auth |
| @nestjs/passport | ^10.x | Auth strategies |
| @nestjs/bullmq | ^10.x | Job queues |
| @nestjs/schedule | ^4.x | Cron (imported but unused) |
| bcryptjs | ^2.x | Password hashing |
| razorpay | ^2.x | Payment gateway |
| sharp | ^0.x | Image processing |
| helmet | ^8.x | Security headers |
| pino | ^9.x | Logging |

### Key Dependencies (apps/web)

| Package | Version | Purpose |
|---------|---------|---------|
| next | 15.1.4 | Framework |
| react | 19.x | UI library |
| @tanstack/react-query | ^5.x | Server state |
| zustand | ^5.x | Client state |
| react-hook-form | ^7.x | Forms |
| zod | ^3.x | Validation |
| sonner | ^1.x | Toasts |
| tailwindcss | ^3.x | Styling |
| lucide-react | ^0.x | Icons |

---

## 38. Final Summary Statistics

| Category | Count |
|----------|-------|
| Total legacy pages | 26 |
| Total new pages | 35 |
| Pages migrated | 22 |
| Pages improved | 6 |
| New pages | 13 |
| Missing pages | 0 |
| Legacy API endpoints | 21 |
| New API endpoints | ~70 |
| APIs migrated | 21 |
| APIs improved | 8 |
| New APIs | ~41 |
| Missing APIs | 0 |
| Prisma models | 16 |
| Legacy tables | 4 |
| New-only models | 12 |
| Security issues found | 15 |
| Performance issues found | 10 |
| Dead code files | 10+ |
| TypeScript `any` usage | 132 |
