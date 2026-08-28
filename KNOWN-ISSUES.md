# KNOWN-ISSUES.md — Beauty Queen E-commerce

## Critical Security Issues

### 1. SQL Injection Vulnerabilities
- **Severity:** CRITICAL
- **Location:** `server/router.js` lines 1497-1498, 1579-1580
- **Issue:** Dynamic column names built via string interpolation in stock update queries
  ```javascript
  const updateQuery = `UPDATE products SET ${column} = ${column} - ? WHERE id=?`;
  ```
- **Impact:** Attacker can inject SQL via column name
- **Fix:** Use a whitelist/switch statement for column names (partially done, but column name from switch is still interpolated)
- **Status:** Partially addressed in backend migration but needs full audit

### 2. Plaintext Passwords
- **Severity:** CRITICAL
- **Location:** `server/router.js` lines 1624, 1645
- **Issue:** Seller passwords stored and compared in plain text
  ```javascript
  // INSERT
  connection.query('INSERT INTO seller(sellername,mobile,email,password,repassword) VALUES(?,?,?,?,?)',
  [sellername,mobile,email,password,repassword])
  // SELECT
  connection.query('SELECT * FROM seller WHERE mobile=? AND password=?', [mobile, password])
  ```
- **Impact:** Any database leak exposes all seller credentials
- **Fix:** Use bcrypt for password hashing (done in backend migration)

### 3. No Payment Verification
- **Severity:** CRITICAL
- **Location:** `server/router.js` lines 1516-1602
- **Issue:** UPI payment success is trusted from frontend form data without server-side Razorpay signature verification
  ```javascript
  // No verification of razorpay_order_id, razorpay_payment_id, razorpay_signature
  ```
- **Impact:** Attacker can mark orders as paid without actually paying
- **Fix:** Implement Razorpay signature verification in paymentController

### 4. Unprotected Admin Routes
- **Severity:** CRITICAL
- **Location:** Multiple routes
- **Issue:** Product CRUD, order management, and admin panel have NO authentication
  ```javascript
  // /addpro, /editthispro, /editthispross/:id, /delete, /allmanagerpro
  // /allordersofallmanagerpro, /editorderstatus, /editstatuspro/:id, /deleteorder
  ```
- **Impact:** Anyone can add/edit/delete products and orders
- **Fix:** Add seller auth middleware to all admin routes

### 5. No CSRF Protection
- **Severity:** HIGH
- **Location:** All POST routes
- **Issue:** No CSRF tokens on any forms
- **Impact:** Cross-site request forgery attacks possible
- **Fix:** Implement CSRF tokens or use SameSite cookies

---

## High Priority Issues

### 6. Broken Image Display
- **Severity:** HIGH
- **Location:** All product pages
- **Issue:** `index.hbs` line 203: `<img src="{{this.image}}">` — Server sends raw LONGBLOB binary data
- **Impact:** Images don't display in browser
- **Fix:** Convert BLOB to base64 data URL or serve as static files (done in migration)

### 7. No Input Validation
- **Severity:** HIGH
- **Location:** All form handlers
- **Issue:** No validation on any user input:
  - Product forms: No length limits, no type checks
  - Checkout forms: No required field validation
  - Login forms: No email format validation
- **Impact:** Invalid data can be stored, XSS possible
- **Fix:** Add express-validator or Joi validation in backend

### 8. No Rate Limiting
- **Severity:** HIGH
- **Location:** OTP endpoints, login endpoints
- **Issue:** No limits on:
  - OTP request frequency (spam possible)
  - Login attempts (brute force possible)
  - API request frequency (DoS possible)
- **Impact:** Service abuse, account compromise
- **Fix:** Implement rate limiting middleware

### 9. Missing Image Cleanup on Delete
- **Severity:** HIGH
- **Location:** `server/router.js` lines 1900-1911
- **Issue:** Product delete removes DB record but leaves image files on server
  ```javascript
  connection.query('DELETE FROM products WHERE id=?', [id])
  // No file cleanup
  ```
- **Impact:** Disk space leak, orphaned files
- **Fix:** Delete images from filesystem before DB deletion

### 10. No Order Payment Status
- **Severity:** HIGH
- **Location:** `server/query.txt` — orders table schema
- **Issue:** No `payment_status` or `payment_id` columns
- **Impact:** Can't track if COD collected, UPI failed, refunds needed
- **Fix:** Add payment_status, payment_id, payment_method columns

### 11. No Email Notifications for Orders
- **Severity:** HIGH
- **Location:** `server/router.js` — payment handlers
- **Issue:** No order confirmation, shipping, or delivery emails sent
- **Impact:** Poor customer experience, support burden
- **Fix:** Implement email templates and triggers

### 12. Cart Price Not Server-Validated
- **Severity:** HIGH
- **Location:** `server/router.js` lines 1434-1514
- **Issue:** `req.body.price` comes from frontend form, not validated against DB
  ```javascript
  const price = product ? product.price : total / quantity; // product.price from WHERE clause
  ```
- **Impact:** Attacker can submit manipulated prices
- **Fix:** Always use DB price for calculations

### 13. Cookie Not Signed
- **Severity:** HIGH
- **Location:** `server/router.js` — all cookie operations
- **Issue:** Cookies not signed, can be tampered with
- **Impact:** Cart/email cookies can be modified by client
- **Fix:** Sign cookies or use encrypted tokens

---

## Medium Priority Issues

### 14. No Pagination
- **Severity:** MEDIUM
- **Location:** All product listing routes
- **Issue:** All products loaded at once, no LIMIT/OFFSET
- **Impact:** Performance degrades with many products
- **Fix:** Add pagination to product listing APIs

### 15. No Search Index
- **Severity:** MEDIUM
- **Location:** `server/router.js` line 1786
- **Issue:** Search uses LIKE '%term%' (full table scan)
- **Impact:** Slow search with many products
- **Fix:** Add fulltext index or use search service

### 16. Duplicate Route Logic
- **Severity:** MEDIUM
- **Location:** `server/router.js` — category routes
- **Issue:** 5 nearly identical route handlers for /saree-view, /kurthi-view, /top-view, /leggin-view, /cosmetics-view
- **Impact:** Maintenance burden, inconsistent behavior
- **Fix:** Single parameterized route (done in migration)

### 17. No Soft Delete
- **Severity:** MEDIUM
- **Location:** `server/router.js` lines 1900-1911, 1934-1936
- **Issue:** Products and orders permanently deleted
- **Impact:** Data recovery impossible, audit trail lost
- **Fix:** Add `deleted_at` timestamp column

### 18. OTP Not Cleared on Use
- **Severity:** MEDIUM
- **Location:** `server/router.js` lines 38-55
- **Issue:** OTP stored in Map but never deleted after successful verification
  ```javascript
  if(storedOtp){
    if(storedOtp.otp === otp){
      // ... success
      // OTP NOT DELETED FROM MAP
    }
  }
  ```
- **Impact:** Same OTP can be reused
- **Fix:** Delete OTP after successful verification

### 19. No Size Validation
- **Severity:** MEDIUM
- **Location:** `server/router.js` lines 1093-1101
- **Issue:** Size validation uses switch statement but only handles 5 sizes
- **Impact:** Invalid sizes pass validation silently
- **Fix:** Validate size against allowed values

### 20. Delivery Charge Calculation Fragile
- **Severity:** MEDIUM
- **Location:** `server/router.js` lines 1253-1282
- **Issue:** Complex string matching for delivery zones:
  ```javascript
  if(pincode==='621171'){ delivery=0 }
  else if(pincode.length===6 && district.includes('tamil nadu')){
    if(area.length > 10){ delivery=50 } else { delivery=100 }
  } else { delivery=100 }
  ```
- **Impact:** Inaccurate delivery charges, fragile logic
- **Fix:** Use pincode lookup API or proper area database

---

## Low Priority Issues

### 21. No Database Migrations
- **Severity:** LOW
- **Location:** `server/query.txt`
- **Issue:** Schema changes done via raw SQL, no migration system
- **Impact:** Schema drift, hard to track changes
- **Fix:** Use Knex migrations or similar

### 22. No Error Logging
- **Severity:** LOW
- **Location:** `server/router.js` — all catch blocks
- **Issue:** Errors only logged to console, no structured logging
- **Impact:** Hard to debug production issues
- **Fix:** Implement Winston or similar logger

### 23. No Health Check
- **Severity:** LOW
- **Location:** N/A
- **Issue:** No /health endpoint for monitoring
- **Impact:** Can't monitor service availability
- **Fix:** Add /health endpoint (done in migration)

### 24. No CORS Configuration
- **Severity:** LOW
- **Location:** `app.js`
- **Issue:** No CORS headers set (same-origin only currently)
- **Impact:** Can't use separate frontend domain
- **Fix:** Configure CORS for production domain

### 25. Unused Dependencies
- **Severity:** LOW
- **Location:** `server/router.js` line 15
- **Issue:** `nodemailer` imported but never used
- **Impact:** Unnecessary dependency
- **Fix:** Remove unused import

### 26. No Image Thumbnails
- **Severity:** LOW
- **Location:** Image processing pipeline
- **Issue:** Only one image size (800px WebP)
- **Impact:** Full-size images loaded for thumbnails (wasted bandwidth)
- **Fix:** Generate multiple sizes during processing

---

## Legacy Issues (Pre-existing in Theme)

### 27. ThemeFisher Assets in Views
- **Severity:** LOW
- **Location:** `views/assets/`, `views/css/`, `views/js/`, `views/plugins/`
- **Issue:** Theme files mixed with templates
- **Impact:** Confusing directory structure
- **Fix:** Clean separation in migration

### 28. Template References to "Isale"
- **Severity:** LOW
- **Location:** `views/index.hbs` lines 272, 277, 304, 309, 326, 331
- **Issue:** Brand name "Isale" appears in banner text, not "Beauty Queen"
- **Impact:** Inconsistent branding
- **Fix:** Update to "Beauty Queen" in migration

### 29. Empty Map Iframe
- **Severity:** LOW
- **Location:** `views/contact.hbs` line 428
- **Issue:** `<iframe src=''>` — empty src, no actual map
- **Impact:** Broken map display
- **Fix:** Add Google Maps embed with actual coordinates

### 30. Dead Code in Templates
- **Severity:** LOW
- **Location:** `views/index.hbs` — unused variables
- **Issue:** `{{#with business}}` block with `{{email}}`, `{{phone}}` etc. but `business` variable never passed from server
- **Impact:** Dead code, confusion
- **Fix:** Remove unused template blocks

---

## Issues Fixed in Migration (backend/)

| Issue | Status | How Fixed |
|-------|--------|-----------|
| Plaintext passwords | FIXED | bcrypt hashing in sellerController.ts |
| No input validation | FIXED | Zod validation in controllers |
| No error handling | FIXED | Proper try/catch in all controllers |
| Duplicate route logic | FIXED | Single parameterized route handlers |
| Broken image display | FIXED | Static file serving from public/image/ |
| No authentication middleware | FIXED | requireSeller middleware added |
| No health check | FIXED | GET /health endpoint added |
| SQL injection risk | FIXED | Parameterized queries throughout |
| No TypeScript | FIXED | Full TypeScript in backend + frontend |

---

## Issues NOT Fixed in Migration (backend/)

| Issue | Status | Reason |
|-------|--------|--------|
| No payment verification | NOT FIXED | Razorpay signature check not implemented |
| No rate limiting | NOT FIXED | Rate limiting middleware not added |
| No CSRF protection | NOT FIXED | CSRF tokens not implemented |
| No email notifications | NOT FIXED | Only OTP emails, no order emails |
| No pagination | NOT FIXED | Product listings return all results |
| No search optimization | NOT FIXED | Still using LIKE query |
| No soft delete | NOT FIXED | Hard deletes remain |
| OTP not cleared on use | NOT FIXED | In-memory Map not cleared |
| Cookie not signed | NOT FIXED | Cookies still unsigned |
| Cart price not validated | NOT FIXED | Frontend price still used in some paths |
| No order payment status | NOT FIXED | Orders table schema unchanged |
| No image thumbnails | NOT FIXED | Only 800px WebP generated |
