# INTEGRATIONS-AUDIT.md — Beauty Queen E-commerce

## External Services

| Service | Current Usage | Credentials Required | Backend Only | Migration Notes |
|---------|--------------|---------------------|-------------|-----------------|
| MySQL (Clever Cloud) | Primary database | DB_HOST, DB_USER, DB_PASS, DB_NAME | Yes | Keep same database, preserve data |
| Razorpay | UPI payment processing | R_id (Key ID), R_key (Key Secret) | Yes | Keep same integration, improve security |
| Brevo | Transactional email (OTP) | BREVO_API_KEY | Yes | Keep same integration |
| Sharp | Image processing (resize, WebP) | None (local) | Yes | Keep same pipeline |
| Multer | File upload handling | None (local) | Yes | Keep same pipeline |
| Zoho Catalyst | Cloud deployment | App config | Yes | May change deployment target |

---

## Service: MySQL (Clever Cloud)

**Purpose:** Primary data storage
**Type:** Relational database
**Driver:** mysql2 (npm package)
**Connection:** Connection pooling (10 connections)
**SSL:** Required (ca.pem certificate)
**Port:** 26141 (non-standard)

### Configuration
- Host: `bk2nvpf0xk0pinn1tpkl-mysql.services.clever-cloud.com`
- User: `up3xfdpyoeuoafgw`
- Database: `bk2nvpf0xk0pinn1tpkl`
- SSL CA: `server/ca.pem`
- Pool: `connectionLimit: 10`, `waitForConnections: true`, `enableKeepAlive: true`

### Usage Locations
- `server/router.js` lines 154-262 — Pool creation and table initialization
- All route handlers — Query execution

### Migration Notes
- Keep existing database and data
- Preserve all existing tables
- Add indexes during migration (ptype, email, status)
- Fix LONGBLOB columns to VARCHAR for image paths
- Add missing constraints

---

## Service: Razorpay

**Purpose:** UPI payment processing
**Type:** Payment gateway
**SDK:** razorpay (npm package)
**Mode:** Server-side order creation, client-side checkout

### Configuration
- Key ID: `process.env.R_id`
- Key Secret: `process.env.R_key`
- Currency: INR

### Flow
1. Backend creates order via `razorpay.orders.create()`
2. Frontend opens Razorpay checkout widget
3. On success, frontend submits form to `/cartpayment`
4. Backend processes order (no payment verification!)

### Usage Locations
- `server/router.js` lines 264-307 — Razorpay initialization and order creation
- `views/razorpay.hbs` — Client-side checkout widget

### Known Issues
- **No payment verification** — server trusts frontend payment success
- **No webhook** — no server-side payment confirmation
- **Razorpay key_id exposed** to frontend in razorpay.hbs
- **No payment_id storage** in orders table
- **No refund integration**
- **No failed payment handling**

### Migration Notes
- Add server-side payment verification (Razorpay signature check)
- Store payment_id in orders table
- Add payment_status field
- Implement webhook endpoint
- Never expose secret key

---

## Service: Brevo (formerly Sendinblue)

**Purpose:** Transactional email (OTP delivery)
**Type:** Email API
**SDK:** @getbrevo/brevo (npm package)

### Configuration
- API Key: `process.env.BREVO_API_KEY`
- Sender: "Beauty Queen" <mvasagan099@gmail.com>

### Email Templates
1. **OTP Email** — 6-digit code with "Beauty Queen OTP Verification" header
   - Subject: "Beauty Queen OTP Code"
   - HTML content with inline styles
   - 5-minute expiry notice

### Usage Locations
- `server/router.js` lines 24-73 — Brevo initialization and OTP sending

### Known Issues
- **No order confirmation emails** — only OTP emails
- **No shipping notifications**
- **No password reset emails**
- **No email templates** — hardcoded HTML in router.js
- **No error retry** — single attempt, fails silently

### Migration Notes
- Keep Brevo integration
- Add order confirmation email template
- Add shipping notification template
- Move email templates to separate files
- Add error retry logic

---

## Service: Sharp

**Purpose:** Image processing (resize + WebP conversion)
**Type:** Image processing library
**SDK:** sharp (npm package)

### Configuration
- Resize: Width 800px
- Format: WebP
- Quality: 80%

### Pipeline
1. File uploaded via Multer to `uploads/` folder
2. Sharp processes: resize to 800px width → convert to WebP → quality 80
3. Saved to `public/image/{productId}-{index}.webp`
4. Original temp file deleted from `uploads/`

### Usage Locations
- `server/router.js` lines 121-147 — `processImage()` function (top-level)
- `server/router.js` lines 1384-1400 — `processImage()` function (inside /addpro)

### Known Issues
- **Two duplicate `processImage` functions** — one top-level (unused), one inside /addpro
- **No image validation** — any file type accepted by Multer
- **No size limit** on uploaded files
- **No thumbnail generation** — only one size (800px)
- **No image optimization** beyond WebP conversion
- **No error handling** if Sharp fails mid-processing

### Migration Notes
- Keep Sharp processing pipeline
- Add file type validation (JPEG, PNG, WebP only)
- Add file size limit (10MB)
- Generate thumbnails for product cards
- Single `processImage` function in service layer

---

## Service: Multer

**Purpose:** File upload handling
**Type:** Multipart form data parser
**SDK:** multer (npm package)

### Configuration
- Storage: Disk storage
- Destination: `uploads/` folder
- Filename: `{timestamp}-{originalname}`

### Usage Locations
- `server/router.js` lines 105-115 — Storage configuration and upload middleware
- `server/router.js` lines 1350-1431 — `/addpro` route with `upload.fields()`

### Known Issues
- **No file type validation** — accepts any file
- **No file size limit** — potential DoS
- **Temp files not cleaned up** on processing failure
- **No virus scanning**
- **Original filenames not sanitized**

### Migration Notes
- Add file filter (image types only)
- Add size limits
- Improve temp file cleanup
- Consider moving to memory storage for small files

---

## Service: Cookie Parser

**Purpose:** Parse HTTP cookies
**SDK:** cookie-parser (npm package)

### Cookies Used
| Cookie | Purpose | Max Age | HttpOnly | Secure |
|--------|---------|---------|----------|--------|
| `email` | Customer authentication | 1 year | Yes | No |
| `cart` | Shopping cart data | 1 year | Yes | No |
| `smobile` | Seller mobile (auth) | ~10 hours | Yes | No |
| `sellerId` | Seller ID (new backend) | 24 hours | Yes | Configurable |

### Known Issues
- **No `secure` flag** in production
- **No `sameSite` attribute**
- **Cart stored in cookie** — not server-side
- **No session management** — pure cookie-based
- **No cookie signing** — cookies can be tampered with

### Migration Notes
- Add `secure: true` in production
- Add `sameSite: 'lax'`
- Consider server-side sessions for cart
- Sign cookies for integrity

---

## Service: Compression

**Purpose:** HTTP response compression
**SDK:** compression (npm package)

### Usage
- `app.js` line 9: `app.use(compression())`

### Migration Notes
- Keep compression middleware

---

## Service: dotenv

**Purpose:** Environment variable loading
**SDK:** dotenv (npm package)

### Usage
- `server/router.js` line 18: `dotenv.config()`

### Migration Notes
- Keep in backend, add to entry point

---

## Unused Imports

| Module | File | Line | Status |
|--------|------|------|--------|
| `nodemailer` | server/router.js | 15 | Imported but never used (Brevo used instead) |
| `{ title }` from 'process' | server/router.js | 8 | Destructured but never used |
| `{ log }` from 'console' | server/router.js | 9 | Destructured but never used |
