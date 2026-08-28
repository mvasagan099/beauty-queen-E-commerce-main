# Migration Status — Beauty Queen E-commerce

## Overview

Migrating from Express + Handlebars + MySQL to Next.js + Node.js/Express + MySQL

---

## Customer Features

| Feature | Old Implementation | New Implementation | Status | Tested |
|---------|-------------------|-------------------|--------|--------|
| Homepage | `GET /home` → `index.hbs` | Next.js `/` page with API calls | MIGRATED | - |
| Login (Email OTP) | `GET /login` → `login.hbs` | Next.js `/login` + API `/api/auth/send-otp` | MIGRATED | - |
| OTP Verification | `POST /verify-otp` → `verify.hbs` | Next.js `/verify` + API `/api/auth/verify-otp` | MIGRATED | - |
| Logout | `GET /clear-mail` | API `/api/auth/logout` + client clear | MIGRATED | - |
| Saree View | `GET /saree-view` → `index-new.hbs` | Next.js `/saree` + API `/api/products?saree` | MIGRATED | - |
| Kurthi View | `GET /kurthi-view` → `index-new.hbs` | Next.js `/kurthi` + API | MIGRATED | - |
| Top View | `GET /top-view` → `index-new.hbs` | Next.js `/top` + API | MIGRATED | - |
| Leggin View | `GET /leggin-view` → `index-new.hbs` | Next.js `/leggin` + API | MIGRATED | - |
| Cosmetics View | `GET /cosmetics-view` → `index-new.hbs` | Next.js `/cosmetics` + API | MIGRATED | - |
| Single Product | `GET /singlepro/:id` → `singleproduct.hbs` | Next.js `/product/[id]` + API | MIGRATED | - |
| Search | `POST /search` | API `/api/products/search` | MIGRATED | - |
| Cart (View) | `GET /cart` → `cart.hbs` | Next.js `/cart` + API | MIGRATED | - |
| Cart (Add) | `POST /addcart` | API `/api/cart` POST | MIGRATED | - |
| Cart (Remove) | `GET /removecart/:id/:size` | API `/api/cart/:id/:size` DELETE | MIGRATED | - |
| Cart (Clear) | `GET /clear-cart` | API `/api/cart` DELETE | MIGRATED | - |
| Buy Now | `POST /buynow` | API `/api/checkout/buynow` | MIGRATED | - |
| Cart Buy Now | `POST /cartbuynow` | API `/api/checkout/cartbuynow` | MIGRATED | - |
| Checkout (Single) | `newcheck.hbs` | Next.js `/checkout` | MIGRATED | - |
| Checkout (Cart) | `ccheckout.hbs` | Next.js `/checkout` | MIGRATED | - |
| COD Payment | `POST /payment` | API `/api/payments/checkout` + `/api/payments/cod/confirm` | MIGRATED | - |
| UPI Payment | `POST /upipayment` → `razorpay.hbs` | API `/api/payments/checkout` + `/api/payments/create-order` + frontend Razorpay + `/api/payments/verify` | MIGRATED | - |
| Cart Payment | `POST /cartpayment` | API `/api/payments/checkout` + `/api/payments/verify` (UPI) / `cod/confirm` (COD) | MIGRATED | - |
| Order Confirmation | `GET /confirmation` → `confirmation.hbs` | Next.js `/confirmation` | MIGRATED | - |
| My Orders | `GET /orders` → `order.hbs` | Next.js `/orders` + API | MIGRATED | - |
| Contact | `GET /contact` → `contact.hbs` | Next.js `/contact` | MIGRATED | - |
| 404 Page | `GET /404` → `404.hbs` | Next.js `not-found.tsx` | MIGRATED | - |

## Seller/Admin Features

| Feature | Old Implementation | New Implementation | Status | Tested |
|---------|-------------------|-------------------|--------|--------|
| Seller Login | `GET /seller-login` | Next.js `/seller/login` + API | MIGRATED | - |
| Seller Signup | `POST /seller-signup` | API `/api/sellers/signup` | MIGRATED | - |
| Seller Login Auth | `POST /seller-login` | API `/api/sellers/login` | MIGRATED | - |
| Seller Dashboard | `GET /sellerhome` | Next.js `/seller` + API | MIGRATED | - |
| Add Product | `GET/POST /addpro` | Next.js `/seller/add-product` + API | MIGRATED | - |
| All Products (Admin) | `GET /allmanagerpro` | Next.js `/seller/products` + API | MIGRATED | - |
| Edit Product | `POST /editthispro` + `editthispross/:id` | Next.js `/seller/edit-product/[id]` + API | MIGRATED | - |
| Delete Product | `POST /delete` | API `/api/products/:id` DELETE | MIGRATED | - |
| All Orders (Admin) | `GET /allordersofallmanagerpro` | Next.js `/seller/orders` + API | MIGRATED | - |
| Edit Order Status | `POST /editorderstatus` + `editstatuspro/:id` | API `/api/orders/:id/status` PUT | MIGRATED | - |
| Delete Order | `POST /deleteorder` | API `/api/orders/:id` DELETE | MIGRATED | - |

## Backend API

| Endpoint | Old Implementation | New Implementation | Status | Tested |
|----------|-------------------|-------------------|--------|--------|
| `GET /api/products` | SQL in router.js | Express controller + MySQL | MIGRATED | - |
| `GET /api/products/:id` | SQL in router.js | Express controller + MySQL | MIGRATED | - |
| `POST /api/products` | SQL in router.js | Express controller + MySQL | MIGRATED | - |
| `PUT /api/products/:id` | SQL in router.js | Express controller + MySQL | MIGRATED | - |
| `DELETE /api/products/:id` | SQL in router.js | Express controller + MySQL | MIGRATED | - |
| `POST /api/auth/send-otp` | Brevo API in router.js | Express service + Brevo | MIGRATED | - |
| `POST /api/auth/verify-otp` | OTP map in router.js | Express service + in-memory store | MIGRATED | - |
| `GET/POST/DELETE /api/cart` | Cookie parsing in router.js | Express controller | MIGRATED | - |
| `POST /api/payments/razorpay-order` | Razorpay in router.js | Express service + Razorpay | MIGRATED | - |
| `POST /api/payments/process` | Order insert in router.js | Express controller + MySQL | MIGRATED | - |
| `POST /api/payments/create-order` | (new in Phase 6) | NestJS + Razorpay SDK — idempotent order creation, backend amounts | MIGRATED | - |
| `POST /api/payments/verify` | (new in Phase 6) | NestJS — signature verify + provider cross-check before order confirm | MIGRATED | - |
| `POST /api/payments/retry` | (new in Phase 6) | NestJS — checkoutId-based retry with attempt tracking | MIGRATED | - |
| `POST /api/payments/cod/confirm` | (new in Phase 6) | NestJS — COD order lifecycle start + notifications | MIGRATED | - |
| `POST /api/payments/webhook` | (new in Phase 6) | NestJS — signature-checked (400 on missing), idempotent event store | MIGRATED | - |
| `POST /api/payments/:paymentId/refund` | (new in Phase 6) | NestJS — admin full/partial refund via Razorpay refunds API | MIGRATED | - |
| `GET /api/payments/checkout/:checkoutId/status` | (new in Phase 6) | NestJS — authoritative payment status by checkoutId (owned) | MIGRATED | - |
| `GET /api/orders` | SQL in router.js | Express controller + MySQL | MIGRATED | - |
| `POST /api/image-upload` | Multer+Sharp in router.js | Express service + Sharp | MIGRATED | - |

## Infrastructure

| Feature | Old Implementation | New Implementation | Status | Tested |
|---------|-------------------|-------------------|--------|--------|
| Project Structure | Monolithic | Monorepo (frontend/backend) | MIGRATED | - |
| Database Connection | mysql2 pool | mysql2 pool (backend) | MIGRATED | - |
| Image Processing | Sharp (800px WebP q80) | Sharp (backend service) | MIGRATED | - |
| File Upload | Multer disk storage | Multer + Sharp pipeline | MIGRATED | - |
| Email Service | Brevo API | Brevo API (backend service) | MIGRATED | - |
| Payment Gateway | Razorpay | Razorpay (backend) | MIGRATED | - |
| Auth Security | Plain cookies | HTTP-only cookies + middleware | MIGRATED | - |
| Env Variables | Mixed (.env + Catalyst) | Proper .env per project | MIGRATED | - |
| TypeScript | None | Full TS (frontend + backend) | MIGRATED | - |
| Error Handling | throw err | Proper error handling | MIGRATED | - |

## Phase 6 — Payment Notes

- The legacy payment flow (`razorpay-order` + `process`) has been superseded by the
  Phase 6 NestJS flow: `checkout` → `create-order` → `verify` (UPI) or `cod/confirm`
  (COD), with `retry`, `refund`, `webhook`, and status endpoints added.
- `payment_webhook_events` replaces silent webhook acknowledgment; amounts are
  backend-authoritative. See `docs/PAYMENT.md`.

## Testing

| Feature | Status | Notes |
|---------|--------|-------|
| API TypeScript | ✅ | `npx tsc --noEmit -p tsconfig.json` clean |
| API Build | ✅ | `nest build` EXIT 0 |
| API Jest | ✅ | 67 tests / 6 suites pass (incl. `src/payments`) |
| Web TypeScript | ✅ | `npx tsc --noEmit` clean |
| Web Build | ✅ | `npm run build` success (incl. `/payment/success`, `/payment/failure`) |
| Migration applied to DB | ⏳ | `20260827_phase6_payments` written + Prisma generate OK; live-DB apply & E2E Razorpay sandbox not yet run |
