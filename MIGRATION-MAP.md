# MIGRATION-MAP.md — Beauty Queen E-commerce

## Overview

This document maps every legacy file to its new location in the migrated backend/frontend structure.

---

## Source → Destination Mapping

### Entry Points

| Legacy File | New File | Purpose | Notes |
|------------|----------|---------|-------|
| `app.js` | `backend/src/server.ts` | Express server entry | Changed from .js to .ts, removed handlebars setup |
| `server/router.js` | Split into 7 controllers + 7 route files | All routes + business logic | Monolith → modular architecture |
| `package.json` (root) | `package.json` (root) | Monorepo scripts | Added concurrently for dev |
| `app-config.json` | Removed | Zoho Catalyst config | Not needed for new deployment |
| `app-config copy.json` | Removed | Duplicate Catalyst config | Deleted |

### Server Files

| Legacy File | New File | Purpose |
|------------|----------|---------|
| `server/router.js` lines 1-20 | `backend/src/server.ts` | Server setup, middleware |
| `server/router.js` lines 21-96 | `backend/src/controllers/authController.ts` | Auth routes (login, OTP, logout) |
| `server/router.js` lines 105-147 | `backend/src/services/imageService.ts` | Multer config + Sharp processing |
| `server/router.js` lines 154-262 | `backend/src/config/database.ts` | MySQL pool + table creation |
| `server/router.js` lines 264-307 | `backend/src/services/razorpayService.ts` | Razorpay initialization + order creation |
| `server/router.js` lines 316-475 | `backend/src/controllers/productController.ts` | Homepage + category queries |
| `server/router.js` lines 482-818 | `backend/src/controllers/productController.ts` | Category view pages |
| `server/router.js` lines 896-921 | `backend/src/controllers/orderController.ts` | Customer order history |
| `server/router.js` lines 958-1005 | `backend/src/controllers/productController.ts` | Single product + related |
| `server/router.js` lines 1014-1089 | `backend/src/controllers/cartController.ts` | Cart operations |
| `server/router.js` lines 1093-1282 | `backend/src/controllers/checkoutController.ts` | Checkout flows |
| `server/router.js` lines 1350-1431 | `backend/src/controllers/productController.ts` | Add product |
| `server/router.js` lines 1434-1602 | `backend/src/controllers/paymentController.ts` | Payment processing |
| `server/router.js` lines 1609-1661 | `backend/src/controllers/sellerController.ts` | Seller auth |
| `server/router.js` lines 1669-1755 | `backend/src/controllers/productController.ts` | Image serving |
| `server/router.js` lines 1758-1777 | `backend/src/controllers/productController.ts` | Admin product list |
| `server/router.js` lines 1780-1816 | `backend/src/controllers/productController.ts` | Search |
| `server/router.js` lines 1879-1955 | `backend/src/controllers/productController.ts` | Edit/delete product |
| `server/router.js` lines 1958-2005 | `backend/src/controllers/orderController.ts` | Order management |
| `server/router.js` lines 2003-2005 | `backend/src/routes/index.ts` | 404 handler |
| `server/query.txt` | `backend/src/config/database.ts` | DDL queries inline |
| `server/ca.pem` | `backend/ca.pem` | SSL certificate (copied) |
| `server/.env` | `backend/.env` | Environment variables (expanded) |

### Templates → Pages

| Legacy Template | New Frontend Page | Purpose |
|----------------|-------------------|---------|
| `views/index.hbs` (2129 lines) | `frontend/app/page.tsx` | Homepage |
| `views/index-new.hbs` (1731 lines) | `frontend/app/saree/page.tsx` | Category pages |
| `views/index-new.hbs` | `frontend/app/kurthi/page.tsx` | Category pages |
| `views/index-new.hbs` | `frontend/app/top/page.tsx` | Category pages |
| `views/index-new.hbs` | `frontend/app/leggin/page.tsx` | Category pages |
| `views/index-new.hbs` | `frontend/app/cosmetics/page.tsx` | Category pages |
| `views/singleproduct.hbs` (1171 lines) | `frontend/app/product/[id]/page.tsx` | Product detail |
| `views/cart.hbs` (1080 lines) | `frontend/app/cart/page.tsx` | Shopping cart |
| `views/emptycart.hbs` (1035 lines) | `frontend/app/cart/page.tsx` | Empty cart state |
| `views/ccheckout.hbs` (1078 lines) | `frontend/app/checkout/page.tsx` | Cart checkout |
| `views/newcheck.hbs` (1064 lines) | `frontend/app/checkout/page.tsx` | Single-item checkout |
| `views/razorpay.hbs` (43 lines) | `frontend/app/checkout/page.tsx` | Payment integration |
| `views/order.hbs` (1004 lines) | `frontend/app/orders/page.tsx` | Order history |
| `views/confirmation.hbs` (956 lines) | `frontend/app/confirmation/page.tsx` | Order confirmation |
| `views/login.hbs` (46 lines) | `frontend/app/login/page.tsx` | Customer login |
| `views/verify.hbs` (53 lines) | `frontend/app/verify/page.tsx` | OTP verification |
| `views/contact.hbs` (1000 lines) | `frontend/app/contact/page.tsx` | Contact page |
| `views/404.hbs` (83 lines) | `frontend/app/not-found.tsx` | 404 page |
| `views/addpro.hbs` (73 lines) | `frontend/app/seller/add-product/page.tsx` | Add product |
| `views/editproduct.hbs` (39 lines) | `frontend/app/seller/edit-product/[id]/page.tsx` | Edit product |
| `views/editstatus.hbs` (31 lines) | `frontend/app/seller/orders/page.tsx` | Edit order status |
| `views/allmanagerpro.hbs` (31 lines) | `frontend/app/seller/products/page.tsx` | Admin product list |
| `views/seller-login.hbs` | `frontend/app/seller/login/page.tsx` | Seller login |
| `views/seller-signup.hbs` | `frontend/app/seller/signup/page.tsx` | Seller signup |
| `views/sellerhome.hbs` | `frontend/app/seller/page.tsx` | Seller dashboard |

### Static Assets

| Legacy Location | New Location | Purpose |
|----------------|--------------|---------|
| `public/css/` | `frontend/app/globals.css` | Admin/seller CSS |
| `public/script/` | Not migrated | Admin/seller JS (client-side) |
| `public/image/*.webp` | `backend/public/image/*.webp` | Product images (copied) |
| `public/utils/` | Not migrated | Utility image |
| `views/assets/` | Not migrated | ThemeFisher assets |
| `views/assets2/` | Not migrated | Bootstrap assets |
| `views/css/` | Not migrated | Theme CSS |
| `views/js/` | Not migrated | Theme JS |
| `views/plugins/` | Not migrated | Slick, Lightbox, etc. |
| `views/images/` | Not migrated | Template images |
| `views/login/` | Not migrated | OTP CSS |
| `resources/image/` | Not migrated | Additional product images |
| `uploads/` | `backend/uploads/` | Temp upload folder |

---

## Route Mapping (Legacy → New API)

### Authentication

| Legacy Route | New Backend Route | New Frontend Route |
|-------------|-------------------|-------------------|
| `GET /login` | - | `GET /login` |
| `POST /send-otp` | `POST /api/auth/send-otp` | `POST /login` (form) |
| `POST /verify-otp` | `POST /api/auth/verify-otp` | `POST /verify` (form) |
| `GET /clear-mail` | `POST /api/auth/logout` | Client-side |
| `GET /seller-login` | - | `GET /seller/login` |
| `POST /seller-login` | `POST /api/sellers/login` | `POST /seller/login` (form) |
| `GET /seller-signup` | - | `GET /seller/signup` |
| `POST /seller-signup` | `POST /api/sellers/signup` | `POST /seller/signup` (form) |

### Products

| Legacy Route | New Backend Route | New Frontend Route |
|-------------|-------------------|-------------------|
| `GET /` | - | `GET /` (redirect to /home) |
| `GET /home` | `GET /api/products/homepage` | `GET /` |
| `GET /saree-view` | `GET /api/products?category=saree` | `GET /saree` |
| `GET /kurthi-view` | `GET /api/products?category=kurthi` | `GET /kurthi` |
| `GET /top-view` | `GET /api/products?category=top` | `GET /top` |
| `GET /leggin-view` | `GET /api/products?category=leggin` | `GET /leggin` |
| `GET /cosmetics-view` | `GET /api/products?category=cosmetics` | `GET /cosmetics` |
| `GET /singlepro/:id` | `GET /api/products/:id` | `GET /product/[id]` |
| `POST /search` | `GET /api/products/search?q=` | `GET /search` |

### Cart

| Legacy Route | New Backend Route | New Frontend Route |
|-------------|-------------------|-------------------|
| `GET /cart` | `GET /api/cart` | `GET /cart` |
| `POST /addcart` | `POST /api/cart` | Client-side |
| `GET /removecart/:id/:size` | `DELETE /api/cart/:id/:size` | Client-side |
| `GET /clear-cart` | `DELETE /api/cart` | Client-side |

### Checkout

| Legacy Route | New Backend Route | New Frontend Route |
|-------------|-------------------|-------------------|
| `POST /buynow` | `POST /api/checkout/buynow` | `POST /checkout` |
| `POST /cartbuynow` | `POST /api/checkout/cartbuynow` | `POST /checkout` |

### Payment

| Legacy Route | New Backend Route | New Frontend Route |
|-------------|-------------------|-------------------|
| `POST /upipayment` | `POST /api/payments/razorpay-order` | `POST /checkout` |
| `POST /payment` | `POST /api/payments/process` | `POST /checkout` |
| `POST /cartpayment` | `POST /api/payments/process` | `POST /checkout` |

### Orders

| Legacy Route | New Backend Route | New Frontend Route |
|-------------|-------------------|-------------------|
| `GET /orders` | `GET /api/orders` | `GET /orders` |
| `GET /confirmation` | - | `GET /confirmation` |
| `GET /allordersofallmanagerpro` | `GET /api/orders/all` | `GET /seller/orders` |
| `POST /editorderstatus` | `GET /api/orders/:id` | `GET /seller/orders` |
| `POST /editstatuspro/:id` | `PUT /api/orders/:id/status` | `POST /seller/orders` |
| `POST /deleteorder` | `DELETE /api/orders/:id` | `POST /seller/orders` |

### Seller/Admin

| Legacy Route | New Backend Route | New Frontend Route |
|-------------|-------------------|-------------------|
| `GET /sellerhome` | `GET /api/sellers/dashboard` | `GET /seller` |
| `GET /addpro` | - | `GET /seller/add-product` |
| `POST /addpro` | `POST /api/products` | `POST /seller/add-product` |
| `GET /allmanagerpro` | `GET /api/products/all` | `GET /seller/products` |
| `POST /editthispro` | `GET /api/products/:id` | `GET /seller/edit-product/[id]` |
| `POST /editthispross/:id` | `PUT /api/products/:id` | `POST /seller/edit-product/[id]` |
| `POST /delete` | `DELETE /api/products/:id` | `POST /seller/products` |

### Images

| Legacy Route | New Backend Route | New Frontend Reference |
|-------------|-------------------|----------------------|
| `GET /image/:id` | Static file serving | `<img src="/image/{id}-0.webp">` |
| `GET /image1/:id` | Static file serving | `<img src="/image/{id}-1.webp">` |

### Other

| Legacy Route | New Backend Route | New Frontend Route |
|-------------|-------------------|-------------------|
| `GET /health` | `GET /health` | - |
| `GET /contact` | - | `GET /contact` |
| `GET /404` | - | `not-found.tsx` |

---

## Package Dependencies Mapping

### Legacy (package.json)

| Package | Version | Purpose | In New Backend | In New Frontend |
|---------|---------|---------|---------------|-----------------|
| express | ^5.1.0 | Web framework | Yes (5.1.0) | No |
| express-handlebars | ^8.0.3 | Template engine | No | No |
| mysql2 | ^3.14.3 | MySQL driver | Yes (3.14.3) | No |
| multer | ^2.0.1 | File upload | Yes (2.0.1) | No |
| sharp | ^0.34.3 | Image processing | Yes (0.34.3) | No |
| cookie-parser | ~1.4.7 | Cookie parsing | Yes (1.4.7) | No |
| compression | ^1.8.0 | HTTP compression | Yes (1.8.0) | No |
| dotenv | ^16.5.0 | Env variables | Yes (16.5.0) | No |
| razorpay | ^2.9.5 | Payment gateway | Yes (2.9.5) | No |
| @getbrevo/brevo | ^2.2.0 | Email API | Yes (2.2.0) | No |
| nodemailer | ^6.9.16 | Email sending | No (unused) | No |

### New Backend Additions

| Package | Purpose | Why Added |
|---------|---------|-----------|
| cors | CORS middleware | Frontend/backend separation |
| joi or zod | Input validation | Security |
| bcryptjs | Password hashing | Security |
| jsonwebtoken | JWT tokens | Auth (optional) |
| express-rate-limit | Rate limiting | Security |
| morgan | HTTP logging | Debugging |
| @types/* | TypeScript types | Type safety |
| tsx | TypeScript execution | Dev workflow |
| typescript | TypeScript compiler | Type safety |

### New Frontend Additions

| Package | Purpose | Why Added |
|---------|---------|-----------|
| next | React framework | App Router, SSR |
| react | UI library | Component-based UI |
| react-dom | React DOM | Rendering |
| typescript | TypeScript | Type safety |
| @types/node | Node types | Type safety |
| @types/react | React types | Type safety |
| tailwindcss | CSS framework | Utility-first CSS |
| autoprefixer | CSS vendor prefixes | Browser compatibility |
| postcss | CSS processing | Tailwind dependency |

---

## New File Structure

```
beauty-queen-E-commerce/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts          # MySQL pool + helpers
│   │   │   └── env.ts               # Environment config
│   │   ├── controllers/
│   │   │   ├── authController.ts     # Login, OTP, logout
│   │   │   ├── cartController.ts     # Cart CRUD
│   │   │   ├── checkoutController.ts # Checkout flows
│   │   │   ├── orderController.ts    # Order management
│   │   │   ├── paymentController.ts  # Payment processing
│   │   │   ├── productController.ts  # Product CRUD
│   │   │   └── sellerController.ts   # Seller auth/dashboard
│   │   ├── middleware/
│   │   │   ├── auth.ts              # Auth middleware
│   │   │   └── upload.ts            # Multer config
│   │   ├── routes/
│   │   │   ├── index.ts             # Main router
│   │   │   ├── authRoutes.ts        # Auth routes
│   │   │   ├── cartRoutes.ts        # Cart routes
│   │   │   ├── checkoutRoutes.ts    # Checkout routes
│   │   │   ├── orderRoutes.ts       # Order routes
│   │   │   ├── paymentRoutes.ts     # Payment routes
│   │   │   ├── productRoutes.ts     # Product routes
│   │   │   └── sellerRoutes.ts      # Seller routes
│   │   ├── services/
│   │   │   ├── brevoService.ts      # Email service
│   │   │   ├── imageService.ts      # Image processing
│   │   │   ├── otpService.ts        # OTP generation
│   │   │   └── razorpayService.ts   # Payment service
│   │   ├── types/
│   │   │   └── index.ts             # TypeScript interfaces
│   │   ├── utils/
│   │   │   └── index.ts             # Helper functions
│   │   └── server.ts                # Entry point
│   ├── public/
│   │   └── image/                   # Product images
│   ├── uploads/                     # Temp uploads
│   ├── ca.pem                       # SSL cert
│   ├── .env                         # Environment variables
│   ├── package.json                 # Backend dependencies
│   └── tsconfig.json                # TypeScript config
├── frontend/
│   ├── app/
│   │   ├── layout.tsx               # Root layout
│   │   ├── page.tsx                 # Homepage
│   │   ├── globals.css              # Global styles
│   │   ├── login/page.tsx           # Login
│   │   ├── verify/page.tsx          # OTP verify
│   │   ├── saree/page.tsx           # Category
│   │   ├── kurthi/page.tsx          # Category
│   │   ├── top/page.tsx             # Category
│   │   ├── leggin/page.tsx          # Category
│   │   ├── cosmetics/page.tsx       # Category
│   │   ├── product/[id]/page.tsx    # Product detail
│   │   ├── cart/page.tsx            # Cart
│   │   ├── checkout/page.tsx        # Checkout
│   │   ├── confirmation/page.tsx    # Order confirmation
│   │   ├── orders/page.tsx          # Order history
│   │   ├── contact/page.tsx         # Contact
│   │   ├── not-found.tsx            # 404
│   │   └── seller/
│   │       ├── page.tsx             # Seller dashboard
│   │       ├── login/page.tsx       # Seller login
│   │       ├── signup/page.tsx      # Seller signup
│   │       ├── add-product/page.tsx # Add product
│   │       ├── products/page.tsx    # Product list
│   │       ├── edit-product/[id]/page.tsx # Edit product
│   │       └── orders/page.tsx      # Order management
│   ├── components/                  # Reusable components
│   ├── lib/
│   │   └── api.ts                   # API client
│   ├── types/
│   │   └── index.ts                 # TypeScript types
│   ├── package.json                 # Frontend dependencies
│   ├── tsconfig.json                # TypeScript config
│   ├── tailwind.config.ts           # Tailwind config
│   └── next.config.ts               # Next.js config
├── package.json                     # Root monorepo package
├── .gitignore                       # Git ignore
├── PROJECT-AUDIT.md                 # This document
├── DATABASE-AUDIT.md                # Database analysis
├── INTEGRATIONS-AUDIT.md            # External services
├── ENVIRONMENT-VARIABLES.md         # Environment config
├── FEATURE-INVENTORY.md             # Feature catalog
├── KNOWN-ISSUES.md                  # Bugs and security issues
├── MIGRATION-MAP.md                 # This file
├── MIGRATION-STATUS.md              # Migration tracking
├── MISSING-FEATURES.md              # What's missing
└── README.md                        # Project documentation
```
