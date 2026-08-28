# PROJECT-AUDIT.md — Beauty Queen E-commerce

## Application Overview

- **Name:** Beauty Queen E-commerce (also branded "Isale" in template)
- **Author:** Mani (mvasagan099)
- **Owner:** Mrs. MAHADEVI ELAIYARAJA (Beautician, 7+ years experience)
- **Location:** VSK Mahal, Veppur, Perambalur, Tamil Nadu 621717
- **Repository:** https://github.com/mvasagan099/beauty-queen-E-commerce
- **Deployment Target:** Zoho Catalyst (Node.js 20 stack)

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Framework | Express 5 |
| Template Engine | express-handlebars (.hbs) |
| Database | MySQL (via mysql2) |
| File Upload | Multer (disk storage) |
| Image Processing | Sharp (800px WebP, quality 80) |
| Payment | Razorpay (UPI) |
| Email | Brevo (TransactionalEmailsApi) |
| Auth | Cookie-based (email cookie, 1 year expiry) |
| Deployment | Zoho Catalyst |

## File Inventory

### Root Files

| File | Lines | Purpose |
|------|-------|---------|
| `app.js` | 73 | Express server entry point |
| `package.json` | 20 | Root monorepo package (references new backend/frontend) |
| `app-config.json` | 10 | Zoho Catalyst deployment config |
| `app-config copy.json` | 10 | Duplicate Catalyst config |
| `.gitignore` | 16 | Git ignore rules |

### Server Files

| File | Lines | Purpose |
|------|-------|---------|
| `server/router.js` | 2005 | ALL routes + business logic (monolithic) |
| `server/.env` | 7 | Environment variables (DB, email) |
| `server/ca.pem` | - | SSL CA cert for Aiven MySQL |
| `server/query.txt` | 51 | Raw SQL DDL migration queries |

### Views (18 .hbs files)

| File | Lines | Purpose |
|------|-------|---------|
| `views/index.hbs` | 2129 | Homepage - banner slider, category sections, new arrivals, trending |
| `views/index-new.hbs` | 1731 | Category view - single category products + low price sidebar |
| `views/singleproduct.hbs` | 1171 | Product detail - 5-image gallery, sizes, add-to-cart, buy-now |
| `views/cart.hbs` | 1080 | Shopping cart - table, totals, coupon section, proceed to checkout |
| `views/ccheckout.hbs` | 1078 | Cart checkout - billing form, payment selection |
| `views/newcheck.hbs` | 1064 | Single-item checkout - billing form, payment selection |
| `views/emptycart.hbs` | 1035 | Empty cart - message + recommended products |
| `views/order.hbs` | 1004 | My Orders - order table with status |
| `views/contact.hbs` | 1000 | Contact page - address, email, phone, hours |
| `views/confirmation.hbs` | 956 | Order confirmation - success message |
| `views/addpro.hbs` | 73 | Add product form (admin) |
| `views/verify.hbs` | 53 | OTP verification page |
| `views/razorpay.hbs` | 43 | Razorpay checkout overlay |
| `views/login.hbs` | 46 | Customer login (email OTP) |
| `views/seller-login.hbs` | ~50 | Seller login form |
| `views/seller-signup.hbs` | ~60 | Seller signup form |
| `views/sellerhome.hbs` | ~100 | Seller dashboard - product list |
| `views/editproduct.hbs` | 39 | Edit product form |
| `views/editstatus.hbs` | 31 | Edit order status form |
| `views/allmanagerpro.hbs` | 31 | Admin panel - ID-based actions |
| `views/404.hbs` | 83 | 404 page |

### Static Assets

| Directory | Files | Purpose |
|-----------|-------|---------|
| `public/css/` | 1 file (470 lines) | Admin/seller panel CSS |
| `public/script/` | 2 files (115 lines) | Admin/seller panel JavaScript |
| `public/image/` | 13 .webp files (~174 KB) | Processed product images |
| `public/utils/` | 1 file | Utility image |
| `views/assets/` | ThemeFisher assets | Main theme CSS/JS/images |
| `views/assets2/` | Bootstrap assets | Login page CSS/JS |
| `views/css/` | ThemeFisher CSS | Theme stylesheets |
| `views/js/` | ThemeFisher JS | Theme scripts |
| `views/plugins/` | 10 plugin dirs | Bootstrap, Slick, Lightbox, etc. |
| `views/images/` | Template images | Banners, products, icons |
| `views/login/` | OTP CSS | Login-specific styles |
| `resources/image/` | 6 .webp files (~113 KB) | Additional product images |
| `uploads/` | 10 files (~185 KB) | Raw uploaded images |

---

## Frontend Pages (Handlebars)

### Page: Homepage
- **Current Route:** `GET /home` (also `GET /` redirects to `/home`)
- **Template:** `views/index.hbs` (2129 lines)
- **Purpose:** Main landing page with banner slider, category product grids, new arrivals, trending, high/low price sections
- **Components Used:** Banner slider (Slick), product grids, sidebar categories, navigation, footer
- **API/Backend Dependencies:** 9 parallel MySQL queries (new arrivals, saree, kurthi, top, leggin, cosmetics, random, high price, low price)
- **Database Dependencies:** `products` table (all columns)
- **Authentication Required:** Optional (shows login link if not authenticated, email if authenticated)
- **Seller/Admin Required:** No
- **Payment Related:** No
- **Status:** IMPLEMENTED

### Page: Login
- **Current Route:** `GET /login`
- **Template:** `views/login.hbs` (46 lines)
- **Purpose:** Customer email input form for OTP-based login
- **Components Used:** Email input form, submit button
- **API/Backend Dependencies:** POST /send-otp (form action)
- **Database Dependencies:** None directly
- **Authentication Required:** No (this IS the auth page)
- **Seller/Admin Required:** No
- **Payment Related:** No
- **Status:** IMPLEMENTED

### Page: OTP Verification
- **Current Route:** `POST /send-otp` renders `verify.hbs`
- **Template:** `views/verify.hbs` (53 lines)
- **Purpose:** Enter OTP code received via email
- **Components Used:** Email display, OTP input, verify button
- **API/Backend Dependencies:** POST /verify-otp (form action)
- **Database Dependencies:** None (in-memory OTP store)
- **Authentication Required:** No (this IS the auth flow)
- **Seller/Admin Required:** No
- **Payment Related:** No
- **Status:** IMPLEMENTED

### Page: Saree View
- **Current Route:** `GET /saree-view`
- **Template:** `views/index-new.hbs` (1731 lines)
- **Purpose:** Display all saree products with low-price sidebar
- **Components Used:** Product grid, sidebar with low price products
- **API/Backend Dependencies:** MySQL query for saree products + low price products
- **Database Dependencies:** `products` table (WHERE ptype='saree')
- **Authentication Required:** Optional
- **Seller/Admin Required:** No
- **Payment Related:** No
- **Status:** IMPLEMENTED

### Page: Kurthi View
- **Current Route:** `GET /kurthi-view`
- **Template:** `views/index-new.hbs` (shared template)
- **Purpose:** Display all kurthi products
- **Components Used:** Same as Saree View
- **API/Backend Dependencies:** MySQL query for kurthi products
- **Database Dependencies:** `products` table (WHERE ptype='kurthi')
- **Authentication Required:** Optional
- **Seller/Admin Required:** No
- **Payment Related:** No
- **Status:** IMPLEMENTED

### Page: Top View
- **Current Route:** `GET /top-view`
- **Template:** `views/index-new.hbs` (shared template)
- **Purpose:** Display all top products
- **Components Used:** Same as Saree View
- **API/Backend Dependencies:** MySQL query for top products
- **Database Dependencies:** `products` table (WHERE ptype='top')
- **Authentication Required:** Optional
- **Seller/Admin Required:** No
- **Payment Related:** No
- **Status:** IMPLEMENTED

### Page: Leggin View
- **Current Route:** `GET /leggin-view`
- **Template:** `views/index-new.hbs` (shared template)
- **Purpose:** Display all leggin products
- **Components Used:** Same as Saree View
- **API/Backend Dependencies:** MySQL query for leggin products
- **Database Dependencies:** `products` table (WHERE ptype='leggin')
- **Authentication Required:** Optional
- **Seller/Admin Required:** No
- **Payment Related:** No
- **Status:** IMPLEMENTED

### Page: Cosmetics View
- **Current Route:** `GET /cosmetics-view`
- **Template:** `views/index-new.hbs` (shared template)
- **Purpose:** Display all cosmetics products
- **Components Used:** Same as Saree View
- **API/Backend Dependencies:** MySQL query for cosmetics products
- **Database Dependencies:** `products` table (WHERE ptype='cosmetics')
- **Authentication Required:** Optional
- **Seller/Admin Required:** No
- **Payment Related:** No
- **Status:** IMPLEMENTED

### Page: Single Product
- **Current Route:** `GET /singlepro/:id`
- **Template:** `views/singleproduct.hbs` (1171 lines)
- **Purpose:** Product detail page with image gallery, sizes, quantity, add-to-cart, buy-now
- **Components Used:** 5-image gallery (click to swap), size selector, quantity selector, add-to-cart button, buy-now button, share buttons, related products
- **API/Backend Dependencies:** MySQL query for product by ID + related products
- **Database Dependencies:** `products` table
- **Authentication Required:** Optional
- **Seller/Admin Required:** No
- **Payment Related:** No (but triggers checkout flow)
- **Status:** IMPLEMENTED

### Page: Cart
- **Current Route:** `GET /cart`
- **Template:** `views/cart.hbs` (1080 lines)
- **Purpose:** Display cart items, totals, proceed to checkout
- **Components Used:** Cart table (image, name, size, price, qty, subtotal, remove), coupon section, cart totals, proceed button
- **API/Backend Dependencies:** Parses cart cookie, fetches products by IDs
- **Database Dependencies:** `products` table
- **Authentication Required:** No (cart is cookie-based)
- **Seller/Admin Required:** No
- **Payment Related:** No
- **Status:** IMPLEMENTED

### Page: Empty Cart
- **Current Route:** `GET /cart` (when cart is empty)
- **Template:** `views/emptycart.hbs` (1035 lines)
- **Purpose:** Display empty cart message with recommended products
- **Components Used:** Empty cart message, random product recommendations
- **API/Backend Dependencies:** MySQL query for random products
- **Database Dependencies:** `products` table
- **Authentication Required:** No
- **Seller/Admin Required:** No
- **Payment Related:** No
- **Status:** IMPLEMENTED

### Page: Single Checkout
- **Current Route:** `POST /buynow` renders `newcheck.hbs`
- **Template:** `views/newcheck.hbs` (1064 lines)
- **Purpose:** Checkout for single item purchase - billing form, payment selection
- **Components Used:** Billing form (name, email, address, pincode, district, landmark), payment radio (UPI/COD), hidden product fields
- **API/Backend Dependencies:** Form submits to /payment (COD) or /upipayment (UPI)
- **Database Dependencies:** None directly (product data in hidden fields)
- **Authentication Required:** No
- **Seller/Admin Required:** No
- **Payment Related:** Yes (payment selection)
- **Status:** IMPLEMENTED

### Page: Cart Checkout
- **Current Route:** `POST /cartbuynow` renders `ccheckout.hbs`
- **Template:** `views/ccheckout.hbs` (1078 lines)
- **Purpose:** Checkout for multiple cart items - billing form, payment selection
- **Components Used:** Same as single checkout but with multiple hidden product fields
- **API/Backend Dependencies:** Form submits to /cartpayment
- **Database Dependencies:** None directly
- **Authentication Required:** No
- **Seller/Admin Required:** No
- **Payment Related:** Yes (payment selection)
- **Status:** IMPLEMENTED

### Page: Razorpay Payment
- **Current Route:** `POST /upipayment` renders `razorpay.hbs`
- **Template:** `views/razorpay.hbs` (43 lines)
- **Purpose:** Razorpay checkout overlay - opens payment widget
- **Components Used:** Razorpay checkout.js script, hidden form for post-payment
- **API/Backend Dependencies:** Razorpay orders.create(), form POST to /cartpayment on success
- **Database Dependencies:** None directly
- **Authentication Required:** No
- **Seller/Admin Required:** No
- **Payment Related:** Yes (core payment page)
- **Status:** IMPLEMENTED

### Page: Order Confirmation
- **Current Route:** `GET /confirmation` (also rendered after /payment, /cartpayment)
- **Template:** `views/confirmation.hbs` (956 lines)
- **Purpose:** Order success page with thank-you message
- **Components Used:** Success message, continue shopping button
- **API/Backend Dependencies:** None
- **Database Dependencies:** None
- **Authentication Required:** No
- **Seller/Admin Required:** No
- **Payment Related:** No
- **Status:** IMPLEMENTED

### Page: My Orders
- **Current Route:** `GET /orders`
- **Template:** `views/order.hbs` (1004 lines)
- **Purpose:** Display customer's order history
- **Components Used:** Order table (image, name, size, price, qty, total, status, date)
- **API/Backend Dependencies:** MySQL JOIN query (orders + products) filtered by email cookie
- **Database Dependencies:** `orders` table, `products` table
- **Authentication Required:** Yes (email cookie)
- **Seller/Admin Required:** No
- **Payment Related:** No
- **Status:** IMPLEMENTED

### Page: Contact
- **Current Route:** `GET /contact`
- **Template:** `views/contact.hbs` (1000 lines)
- **Purpose:** Contact information page with address, email, phone, business hours
- **Components Used:** Store address, email, phone, hours, empty map iframe
- **API/Backend Dependencies:** None
- **Database Dependencies:** None
- **Authentication Required:** No
- **Seller/Admin Required:** No
- **Payment Related:** No
- **Status:** IMPLEMENTED

### Page: 404
- **Current Route:** `GET /404`
- **Template:** `views/404.hbs` (83 lines)
- **Purpose:** Page not found error page
- **Components Used:** Error message, go home button
- **API/Backend Dependencies:** None
- **Database Dependencies:** None
- **Authentication Required:** No
- **Seller/Admin Required:** No
- **Payment Related:** No
- **Status:** IMPLEMENTED

### Page: Add Product
- **Current Route:** `GET /addpro` and `POST /addpro`
- **Template:** `views/addpro.hbs` (73 lines)
- **Purpose:** Admin form to add new products
- **Components Used:** Form with ID, name, sizes, MRP, price, type, quantity, description, 5 file uploads
- **API/Backend Dependencies:** POST /addpro with multer + sharp processing
- **Database Dependencies:** `products` table (INSERT)
- **Authentication Required:** No
- **Seller/Admin Required:** No (UNPROTECTED!)
- **Payment Related:** No
- **Status:** IMPLEMENTED

### Page: Seller Login
- **Current Route:** `GET /seller-login`
- **Template:** `views/seller-login.hbs` (~50 lines)
- **Purpose:** Seller authentication login form
- **Components Used:** Mobile number input, password input, submit button
- **API/Backend Dependencies:** POST /seller-login
- **Database Dependencies:** `seller` table
- **Authentication Required:** No (this IS the auth page)
- **Seller/Admin Required:** No (this IS the seller auth)
- **Payment Related:** No
- **Status:** IMPLEMENTED

### Page: Seller Signup
- **Current Route:** `GET /seller-signup`
- **Template:** `views/seller-signup.hbs` (~60 lines)
- **Purpose:** New seller registration form
- **Components Used:** Name, mobile, email, password, re-password inputs
- **API/Backend Dependencies:** POST /seller-signup
- **Database Dependencies:** `seller` table (INSERT)
- **Authentication Required:** No
- **Seller/Admin Required:** No
- **Payment Related:** No
- **Status:** IMPLEMENTED

### Page: Seller Dashboard
- **Current Route:** `GET /sellerhome`
- **Template:** `views/sellerhome.hbs` (~100 lines)
- **Purpose:** Seller dashboard showing all products
- **Components Used:** Product list table, navigation to add/edit/delete
- **API/Backend Dependencies:** MySQL SELECT * FROM products
- **Database Dependencies:** `products` table, `cust` table (if exists)
- **Authentication Required:** smobile cookie
- **Seller/Admin Required:** Yes
- **Payment Related:** No
- **Status:** IMPLEMENTED

### Page: Edit Product
- **Current Route:** `POST /editthispro` renders `editproduct.hbs`
- **Template:** `views/editproduct.hbs` (39 lines)
- **Purpose:** Edit existing product details
- **Components Used:** Pre-filled form with product fields
- **API/Backend Dependencies:** POST /editthispro (fetch), POST /editthispross/:id (update)
- **Database Dependencies:** `products` table (SELECT, UPDATE)
- **Authentication Required:** No
- **Seller/Admin Required:** No (UNPROTECTED!)
- **Payment Related:** No
- **Status:** IMPLEMENTED

### Page: Edit Order Status
- **Current Route:** `POST /editorderstatus` renders `editstatus.hbs`
- **Template:** `views/editstatus.hbs` (31 lines)
- **Purpose:** Edit order status
- **Components Used:** Status input field
- **API/Backend Dependencies:** POST /editorderstatus (fetch), POST /editstatuspro/:id (update)
- **Database Dependencies:** `orders` table (SELECT, UPDATE)
- **Authentication Required:** No
- **Seller/Admin Required:** No (UNPROTECTED!)
- **Payment Related:** No
- **Status:** IMPLEMENTED

### Page: All Manager Products
- **Current Route:** `GET /allmanagerpro`
- **Template:** `views/allmanagerpro.hbs` (31 lines)
- **Purpose:** Admin panel for product/order management
- **Components Used:** ID input, edit/delete product buttons, edit/delete order buttons
- **API/Backend Dependencies:** Multiple POST endpoints
- **Database Dependencies:** `products` table, `orders` table
- **Authentication Required:** No
- **Seller/Admin Required:** No (UNPROTECTED!)
- **Payment Related:** No
- **Status:** IMPLEMENTED

---

## Route Inventory (Complete)

### Customer Routes

| Method | Existing Route | Purpose | Auth Required | Database Used | Target API |
|--------|---------------|---------|---------------|---------------|------------|
| GET | `/` | Redirect to /home | No | None | - |
| GET | `/home` | Homepage with product grids | Optional | products | GET /api/products/homepage |
| GET | `/login` | Login page (email input) | No | None | - |
| POST | `/send-otp` | Send OTP via Brevo | No | None (in-memory) | POST /api/auth/send-otp |
| POST | `/verify-otp` | Verify OTP, set cookie | No | None (in-memory) | POST /api/auth/verify-otp |
| GET | `/saree-view` | Saree products | Optional | products | GET /api/products?category=saree |
| GET | `/kurthi-view` | Kurthi products | Optional | products | GET /api/products?category=kurthi |
| GET | `/top-view` | Top products | Optional | products | GET /api/products?category=top |
| GET | `/leggin-view` | Leggin products | Optional | products | GET /api/products?category=leggin |
| GET | `/cosmetics-view` | Cosmetics products | Optional | products | GET /api/products?category=cosmetics |
| GET | `/singlepro/:id` | Product detail | Optional | products | GET /api/products/:id |
| POST | `/search` | Search products | No | products | GET /api/products/search?q= |
| GET | `/cart` | View cart | No | products | GET /api/cart |
| POST | `/addcart` | Add to cart | No | products | POST /api/cart |
| POST | `/buynow` | Single item buy | No | products | POST /api/checkout/buynow |
| POST | `/cartbuynow` | Cart buy | No | products | POST /api/checkout/cartbuynow |
| GET | `/removecart/:id/:size` | Remove from cart | No | None | DELETE /api/cart/:id/:size |
| GET | `/clear-cart` | Clear cart | No | None | DELETE /api/cart |
| GET | `/clear-mail` | Logout (clear email) | No | None | POST /api/auth/logout |
| GET | `/orders` | Customer orders | Yes (email) | orders+products | GET /api/orders |
| GET | `/contact` | Contact page | No | None | - |
| GET | `/404` | 404 page | No | None | - |
| GET | `/health` | Health check | No | None | GET /health |

### Payment Routes

| Method | Existing Route | Purpose | Auth Required | Database Used | Target API |
|--------|---------------|---------|---------------|---------------|------------|
| POST | `/upipayment` | Create Razorpay order | No | None | POST /api/payments/razorpay-order |
| POST | `/payment` | Process single-item COD/UPI | No | products, orders | POST /api/payments/process |
| POST | `/cartpayment` | Process cart COD/UPI | No | products, orders | POST /api/payments/process |
| GET | `/confirmation` | Order success page | No | None | - |

### Seller/Admin Routes

| Method | Existing Route | Purpose | Auth Required | Database Used | Target API |
|--------|---------------|---------|---------------|---------------|------------|
| GET | `/seller-login` | Seller login page | No | None | - |
| POST | `/seller-login` | Seller auth | No | seller | POST /api/sellers/login |
| GET | `/seller-signup` | Seller signup page | No | None | - |
| POST | `/seller-signup` | Register seller | No | seller | POST /api/sellers/signup |
| GET | `/sellerhome` | Seller dashboard | No (smobile cookie) | products, cust | GET /api/sellers/dashboard |
| GET | `/addpro` | Add product form | No | None | - |
| POST | `/addpro` | Create product + images | No | products | POST /api/products |
| GET | `/allmanagerpro` | Admin panel | No | None | - |
| POST | `/editthispro` | Fetch product for edit | No | products | GET /api/products/:id |
| POST | `/editthispross/:id` | Update product | No | products | PUT /api/products/:id |
| POST | `/delete` | Delete product | No | products | DELETE /api/products/:id |
| GET | `/allordersofallmanagerpro` | All orders | No | orders+products | GET /api/orders/all |
| POST | `/editorderstatus` | Fetch order for edit | No | orders | GET /api/orders/:id |
| POST | `/editstatuspro/:id` | Update order status | No | orders | PUT /api/orders/:id/status |
| POST | `/deleteorder` | Delete order | No | orders | DELETE /api/orders/:id |

### Image Routes

| Method | Existing Route | Purpose | Auth Required | Database Used | Target API |
|--------|---------------|---------|---------------|---------------|------------|
| GET | `/image/:id` | Serve product image (main) | No | products.image | Static file serving |
| GET | `/image1/:id` | Serve product image1 | No | products.image1 | Static file serving |

---

## Client-Side JavaScript

### `public/script/script.js` (98 lines)

| Function | Purpose | Used By |
|----------|---------|---------|
| `showprofilebar()` | Show profile dropdown | Seller dashboard |
| `closeprofilebar()` | Hide profile dropdown | Seller dashboard |
| `showviewprofilebar()` | Show view-profile panel | Seller dashboard |
| `closeviewprofilebar()` | Hide view-profile panel | Seller dashboard |
| `showproduct1(id)` | Open product detail modal | Admin panel |
| `closeproduct()` | Close product detail modal | Admin panel |
| `showsaleproduct()` | Open add-product form | Admin panel |
| `closesaleproduct()` | Close add-product form | Admin panel |
| `closeany()` | Close all modals | Admin panel |
| `showviewcart()` | Open cart modal | Admin panel |
| `closeviewcart()` | Close cart modal | Admin panel |
| `gologin()` | Navigate to home | Various |
| `logout()` | Navigate to logout | Various |
| `showorders()` | Navigate to orders | Various |
| `showallorders()` | Navigate to all orders | Admin |

### `public/script/script2.js` (17 lines)

| Function | Purpose | Used By |
|----------|---------|---------|
| `showproduct(id)` | POST product price to server | Admin panel |

### `views/script.js` (loaded in some .hbs templates)

| Function | Purpose | Used By |
|----------|---------|---------|
| Navbar toggle | Mobile menu toggle | Navigation |

---

## Business Logic Locations

### Product Pricing Logic
- **Location:** `server/router.js` lines 1460-1462, 1546
- **Logic:** `price = product ? product.price : total / quantity` (fallback if product not found)
- **Issue:** Price is taken from frontend form, not validated server-side in some paths

### Stock Check Logic
- **Location:** `server/router.js` lines 1093-1101, 1166-1174, 1246-1252
- **Logic:** Switch statement maps size name to product size column, compares requested qty to available

### Cart Cookie Format
- **Location:** `server/router.js` lines 1014-1018, 1104-1112
- **Format:** `productId-size:quantity,productId-size:quantity,...`
- **Example:** `5-M:2,12-L:1,23-XL:3`

### Image Processing Pipeline
- **Location:** `server/router.js` lines 121-147, 1384-1400
- **Pipeline:** Upload (Multer disk) → Sharp resize 800px → WebP quality 80 → Save to public/image/ → Delete temp

### OTP Generation and Verification
- **Location:** `server/router.js` lines 21, 28-30, 38-96
- **Storage:** In-memory Map (lost on server restart)
- **Expiry:** 5 minutes
- **Format:** 6-digit numeric string

### Order Creation Logic
- **Location:** `server/router.js` lines 1434-1514 (single), 1516-1602 (cart)
- **Logic:** Insert order → Reduce stock → Clear cart → Render confirmation
- **Issue:** Stock reduction uses string interpolation for column name (SQL injection risk)
