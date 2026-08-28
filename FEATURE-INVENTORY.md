# FEATURE-INVENTORY.md — Beauty Queen E-commerce

## Feature Count Summary

| Category | Total Features | Implemented | Not Implemented |
|----------|---------------|-------------|-----------------|
| Authentication | 6 | 2 | 4 |
| Product Management | 8 | 4 | 4 |
| Shopping Cart | 5 | 4 | 1 |
| Checkout | 4 | 3 | 1 |
| Payment | 4 | 2 | 2 |
| Order Management | 4 | 1 | 3 |
| Email | 2 | 1 | 1 |
| UI/UX | 11 | 7 | 4 |
| Admin/Seller | 6 | 3 | 3 |
| **TOTAL** | **50** | **27** | **23** |

---

## Feature: Customer Login (Email OTP)

**Category:** Authentication
**Status:** PARTIALLY IMPLEMENTED
**Priority:** CRITICAL

**Current Implementation:**
- User enters email address
- Server generates 6-digit numeric OTP
- OTP stored in-memory Map with 5-minute expiry
- OTP sent via Brevo transactional email (template: "Beauty Queen OTP Verification")
- User enters OTP on verification page
- On success, email cookie set (1 year expiry, HttpOnly)
- Login link hidden when logged in, email shown instead

**What Works:**
- OTP generation and storage
- Brevo email delivery
- Cookie setting on verification
- 5-minute OTP expiry

**What's Missing:**
- No max attempts limit (infinite tries possible)
- No rate limiting on OTP requests
- No brute-force protection
- No email format validation before sending

**Affected Files:**
- Route: `server/router.js` lines 21-96
- Template: `views/login.hbs`, `views/verify.hbs`

**New Implementation Location:**
- API: `backend/src/controllers/authController.ts`
- Service: `backend/src/services/otpService.ts`
- Frontend: `frontend/app/login/page.tsx`, `frontend/app/verify/page.tsx`

---

## Feature: Customer Logout

**Category:** Authentication
**Status:** IMPLEMENTED
**Priority:** HIGH

**Current Implementation:**
- GET /clear-mail clears email cookie
- Frontend link hidden/not visible in navigation

**What Works:**
- Cookie clearing on server request

**What's Missing:**
- No visible logout button in navigation
- No confirmation before logout
- Cart not cleared on logout

**Affected Files:**
- Route: `server/router.js` line 116

**New Implementation Location:**
- API: `backend/src/controllers/authController.ts`
- Frontend: Client-side cookie clearing

---

## Feature: Password-Based Seller Login

**Category:** Authentication
**Status:** PARTIALLY IMPLEMENTED
**Priority:** HIGH

**Current Implementation:**
- Seller enters mobile number and password
- Server queries `seller` table by mobile and password (plain text comparison)
- On success, `smobile` cookie set (10 hours expiry)
- Uses `views/seller-login.hbs` template

**What Works:**
- Basic login flow
- Cookie-based session
- Redirect to seller dashboard

**What's Missing:**
- **Passwords stored in PLAIN TEXT** — no hashing
- No session management
- No logout functionality
- No password complexity requirements
- No account lockout after failed attempts

**Affected Files:**
- Route: `server/router.js` lines 1641-1656
- Template: `views/seller-login.hbs`

**New Implementation Location:**
- API: `backend/src/controllers/sellerController.ts`
- Frontend: `frontend/app/seller/login/page.tsx`

---

## Feature: Product Listing (Homepage)

**Category:** Product Management
**Status:** PARTIALLY IMPLEMENTED
**Priority:** CRITICAL

**Current Implementation:**
- Homepage loads with 9 parallel MySQL queries
- Each query: `WHERE (size_s+size_m+size_l+size_xl+size_xxl) > 0` (in-stock only)
- New Arrivals: `ORDER BY id DESC LIMIT 4`
- 5 category sections: Saree, Kurthi, Top, Leggin, Cosmetics (6 random each)
- High Price: `ORDER BY price DESC LIMIT 4`
- Low Price: `ORDER BY price ASC LIMIT 4`
- Product cards show: image (LONGBLOB → base64), name, price, MRP, view button
- Navigation shows categories, login link (or email if logged in)
- Banner slider with Slick.js
- Left sidebar with category links
- Footer with copyright

**What Works:**
- Product grid display
- Category filtering
- Price sorting
- In-stock filtering
- Banner slider

**What's Missing:**
- **Image loading** — Server sends raw BLOB binary data to browser (not converted to base64)
- **Image display broken** — Images don't display in browser
- **No loading states**
- **No error handling** — If query fails, page breaks
- **No product count** — Can't see total products per category
- **No search bar** visible on homepage

**Affected Files:**
- Route: `server/router.js` lines 316-475
- Template: `views/index.hbs` (2129 lines)

**New Implementation Location:**
- API: `backend/src/controllers/productController.ts`
- Frontend: `frontend/app/page.tsx`

---

## Feature: Category View Pages

**Category:** Product Management
**Status:** PARTIALLY IMPLEMENTED
**Priority:** HIGH

**Current Implementation:**
- 5 separate routes: /saree-view, /kurthi-view, /top-view, /leggin-view, /cosmetics-view
- All use shared template: `views/index-new.hbs`
- Each queries products WHERE ptype=? AND in-stock
- Sidebar shows "Low Price Products" (4 items)
- Same template structure as homepage

**What Works:**
- Category filtering
- Low price sidebar
- Same navigation/footer

**What's Missing:**
- **Image loading** — Same BLOB issue
- **No pagination**
- **No sort options** (price low-high, high-low, newest)
- **No product count display**
- **No filter options** (size, price range)

**Affected Files:**
- Route: `server/router.js` lines 482-818
- Template: `views/index-new.hbs` (1731 lines)

**New Implementation Location:**
- API: `backend/src/controllers/productController.ts`
- Frontend: `frontend/app/saree/page.tsx`, etc.

---

## Feature: Product Detail Page

**Category:** Product Management
**Status:** PARTIALLY IMPLEMENTED
**Priority:** CRITICAL

**Current Implementation:**
- Route: /singlepro/:id
- 5-image gallery with click-to-swap
- Size selector (S/M/L/XL/XXL) — only shows in-stock sizes
- Quantity input (validated against stock)
- Add to Cart button
- Buy Now button (redirects to checkout)
- Related products (4 random items)
- Share buttons (WhatsApp, Facebook, X, Pinterest)
- Product meta: name, MRP, discount, price, category, description, stock summary

**What Works:**
- Image gallery
- Size/quantity selection
- Stock validation
- Add to cart / Buy now flows
- Share buttons

**What's Missing:**
- **Image loading** — BLOB data doesn't display
- **No wishlist/favorite feature**
- **No reviews/ratings**
- **No product video support**
- **No size chart**
- **No delivery estimate**
- **No stock count display** — Only "Out of Stock" label
- **No zoom on hover** for product images

**Affected Files:**
- Route: `server/router.js` lines 958-1005
- Template: `views/singleproduct.hbs` (1171 lines)

**New Implementation Location:**
- API: `backend/src/controllers/productController.ts`
- Frontend: `frontend/app/product/[id]/page.tsx`

---

## Feature: Shopping Cart

**Category:** Shopping Cart
**Status:** PARTIALLY IMPLEMENTED
**Priority:** CRITICAL

**Current Implementation:**
- Cart stored in cookie (format: `productId-size:quantity,...`)
- GET /cart: Parses cookie, fetches products, displays table
- POST /addcart: Adds item to cookie
- GET /removecart/:id/:size: Removes specific item
- GET /clear-cart: Clears entire cart
- Cart shows: image, name, size, unit price, quantity controls, subtotal, remove button
- Cart summary: total items, subtotal, estimated tax, grand total
- Coupon section (form exists but no functionality)
- Proceed to checkout button

**What Works:**
- Cookie-based cart persistence
- Add/remove/clear operations
- Price calculation
- Tax calculation

**What's Missing:**
- **Coupon/discount system** — Form exists but no backend logic
- **Cart count in navbar** — No badge showing item count
- **Size change** — Can't change size without removing and re-adding
- **Stock validation** — Doesn't check if item went out of stock since adding

**Affected Files:**
- Route: `server/router.js` lines 1014-1089
- Template: `views/cart.hbs`, `views/emptycart.hbs`

**New Implementation Location:**
- API: `backend/src/controllers/cartController.ts`
- Frontend: `frontend/app/cart/page.tsx`

---

## Feature: Checkout Flow (Single Item)

**Category:** Checkout
**Status:** PARTIALLY IMPLEMENTED
**Priority:** CRITICAL

**Current Implementation:**
- POST /buynow: Creates hidden form, auto-submits to /newcheck
- /newcheck renders checkout form with:
  - Billing: name, email, phone, full address, pincode, district, landmark
  - Payment: UPI or COD radio
  - Hidden fields: product data
  - Total calculation with delivery charge logic
- Delivery charge: ₹0 for VSK Mahal (code 621171), ₹50 for rural Tamil Nadu, ₹100 other states

**What Works:**
- Billing form
- Payment selection
- Delivery charge calculation
- Address storage in order

**What's Missing:**
- **Form validation** — No required field validation
- **No address autocomplete**
- **No saved addresses** for returning customers
- **No order summary** visible during checkout
- **Delivery charge calculation** uses complex string matching (fragile)

**Affected Files:**
- Route: `server/router.js` lines 1222-1283
- Template: `views/newcheck.hbs` (1064 lines)

**New Implementation Location:**
- API: `backend/src/controllers/checkoutController.ts`
- Frontend: `frontend/app/checkout/page.tsx`

---

## Feature: Checkout Flow (Cart Items)

**Category:** Checkout
**Status:** PARTIALLY IMPLEMENTED
**Priority:** CRITICAL

**Current Implementation:**
- POST /cartbuynow: Similar to single but with multiple products
- Creates hidden form with all cart items
- Same billing form and payment selection

**What Works:**
- Multi-item checkout
- Same billing/payment flow

**What's Missing:**
- **Same as single checkout** — No validation, no saved addresses
- **No order splitting** for different sellers

**Affected Files:**
- Route: `server/router.js` lines 1288-1346
- Template: `views/ccheckout.hbs` (1078 lines)

**New Implementation Location:**
- API: `backend/src/controllers/checkoutController.ts`
- Frontend: `frontend/app/checkout/page.tsx`

---

## Feature: Razorpay Payment (UPI)

**Category:** Payment
**Status:** PARTIALLY IMPLEMENTED
**Priority:** CRITICAL

**Current Implementation:**
- POST /upipayment: Creates Razorpay order (amount: total + 50, currency: INR)
- Renders `razorpay.hbs` with order ID and amount
- Client-side: Opens Razorpay checkout widget
- On success: Redirects to /cartpayment with payment details
- **NO PAYMENT VERIFICATION** — Server trusts frontend success

**What Works:**
- Order creation
- Payment widget
- Client-side redirect on success

**What's Missing:**
- **Server-side payment verification** (Razorpay signature check)
- **Payment ID storage** in orders table
- **Webhook handler** for payment confirmation
- **Failed payment handling**
- **Refund integration**
- **Payment status tracking**

**Affected Files:**
- Route: `server/router.js` lines 264-307
- Template: `views/razorpay.hbs` (43 lines)

**New Implementation Location:**
- API: `backend/src/controllers/paymentController.ts`
- Service: `backend/src/services/razorpayService.ts`
- Frontend: `frontend/app/checkout/page.tsx` (Razorpay component)

---

## Feature: COD Payment

**Category:** Payment
**Status:** IMPLEMENTED (with issues)
**Priority:** HIGH

**Current Implementation:**
- POST /payment (single item) and /cartpayment (cart):
  - Inserts order into orders table
  - Reduces stock in products table
  - Clears cart cookie
  - Renders confirmation page

**What Works:**
- Order creation
- Stock reduction
- Cart clearing
- Confirmation page

**What's Missing:**
- **No payment verification**
- **No order confirmation email**
- **Stock reduction uses string interpolation** (potential SQL injection)
- **No order ID tracking** in response

**Affected Files:**
- Route: `server/router.js` lines 1434-1602

**New Implementation Location:**
- API: `backend/src/controllers/paymentController.ts`
- Frontend: `frontend/app/confirmation/page.tsx`

---

## Feature: Order History

**Category:** Order Management
**Status:** PARTIALLY IMPLEMENTED
**Priority:** HIGH

**Current Implementation:**
- GET /orders: Requires email cookie
- JOINs orders and products tables
- Shows: image, product name, size, price, quantity, subtotal, status, order date
- Sorted by newest first

**What Works:**
- Order listing
- Product details in order
- Status display

**What's Missing:**
- **No order grouping** — Multi-item orders show as separate rows
- **No order detail view** — Can't see full order info
- **No order tracking**
- **No reorder functionality**
- **No order cancellation**

**Affected Files:**
- Route: `server/router.js` lines 896-921
- Template: `views/order.hbs` (1004 lines)

**New Implementation Location:**
- API: `backend/src/controllers/orderController.ts`
- Frontend: `frontend/app/orders/page.tsx`

---

## Feature: Search

**Category:** Product Management
**Status:** IMPLEMENTED
**Priority:** MEDIUM

**Current Implementation:**
- POST /search: Redirects to /search-results?q=searchterm
- Query: `WHERE name LIKE '%term%' AND in-stock`
- Shows matching products in grid

**What Works:**
- Basic text search
- In-stock filtering

**What's Missing:**
- **No search bar visible** on most pages
- **No autocomplete/suggestions**
- **No search results count**
- **No search in description** (only name)
- **No category filter in search**

**Affected Files:**
- Route: `server/router.js` lines 1780-1816
- Template: `views/search-results.hbs` (not in list)

**New Implementation Location:**
- API: `backend/src/controllers/productController.ts`
- Frontend: `frontend/app/search/page.tsx`

---

## Feature: Add Product (Admin)

**Category:** Admin/Seller
**Status:** IMPLEMENTED (UNPROTECTED)
**Priority:** HIGH

**Current Implementation:**
- GET /addpro: Shows form
- POST /addpro: Receives form + 5 image files
- Images processed: Sharp resize 800px → WebP quality 80
- Saved to public/image/{productId}-{index}.webp
- Product inserted into products table
- **NO AUTH CHECK** — Any visitor can access

**What Works:**
- Form display
- Multi-file upload (5 images)
- Image processing
- Database insertion

**What's Missing:**
- **Authentication/authorization check**
- **Input validation**
- **File type validation** (any file accepted)
- **File size limits**
- **Duplicate product detection**

**Affected Files:**
- Route: `server/router.js` lines 1350-1431
- Template: `views/addpro.hbs` (73 lines)

**New Implementation Location:**
- API: `backend/src/controllers/productController.ts`
- Middleware: `backend/src/middleware/auth.ts`
- Frontend: `frontend/app/seller/add-product/page.tsx`

---

## Feature: Edit Product (Admin)

**Category:** Admin/Seller
**Status:** IMPLEMENTED (UNPROTECTED)
**Priority:** HIGH

**Current Implementation:**
- POST /editthispro: Fetches product by ID, renders edit form
- POST /editthispross/:id: Updates product (name, price, description, mrp, sizes)
- Does NOT update images (images can't be changed)

**What Works:**
- Product fetch for editing
- Field updates
- Image preservation

**What's Missing:**
- **Authentication check**
- **Image update** capability
- **Input validation**
- **Audit log** of changes

**Affected Files:**
- Route: `server/router.js` lines 1916-1955
- Template: `views/editproduct.hbs` (39 lines)

**New Implementation Location:**
- API: `backend/src/controllers/productController.ts`
- Frontend: `frontend/app/seller/edit-product/[id]/page.tsx`

---

## Feature: Delete Product (Admin)

**Category:** Admin/Seller
**Status:** IMPLEMENTED (UNPROTECTED)
**Priority:** HIGH

**Current Implementation:**
- POST /delete: Deletes product by ID
- No image cleanup (images remain on server)

**What Works:**
- Database deletion

**What's Missing:**
- **Authentication check**
- **Image cleanup** from filesystem
- **Cascade delete** of related orders
- **Confirmation dialog**
- **Soft delete** option

**Affected Files:**
- Route: `server/router.js` lines 1900-1911

**New Implementation Location:**
- API: `backend/src/controllers/productController.ts`

---

## Feature: Order Status Management (Admin)

**Category:** Admin/Seller
**Status:** IMPLEMENTED (UNPROTECTED)
**Priority:** HIGH

**Current Implementation:**
- POST /editorderstatus: Fetches order, shows status form
- POST /editstatuspro/:id: Updates order status
- POST /deleteorder: Deletes order

**What Works:**
- Status update
- Order deletion

**What's Missing:**
- **Authentication check**
- **Status validation** (can set any string)
- **Status history/audit trail**
- **Customer notification** on status change
- **Bulk status update**

**Affected Files:**
- Route: `server/router.js` lines 1958-2005
- Template: `views/editstatus.hbs` (31 lines)

**New Implementation Location:**
- API: `backend/src/controllers/orderController.ts`
- Frontend: `frontend/app/seller/orders/page.tsx`

---

## Feature: Image Serving

**Category:** UI/UX
**Status:** IMPLEMENTED (with issues)
**Priority:** HIGH

**Current Implementation:**
- GET /image/:id: Fetches product.image from DB, sends raw BLOB
- GET /image1/:id: Fetches product.image1 from DB, sends raw BLOB
- **ISSUE:** Raw binary data sent, browsers can't display

**What Works:**
- Database lookup
- Binary data retrieval

**What's Missing:**
- **Base64 encoding** for browser display
- **Proper Content-Type header** (missing)
- **Image caching headers**
- **Error handling** for missing images
- **Fallback image** for missing products

**Affected Files:**
- Route: `server/router.js` lines 1684-1755

**New Implementation Location:**
- Static file serving in `backend/public/image/`
- Frontend references images directly via URL

---

## Feature: Navigation

**Category:** UI/UX
**Status:** PARTIALLY IMPLEMENTED
**Priority:** MEDIUM

**Current Implementation:**
- Logo (Beauty Queen text)
- Category links: Saree, Kurthi, Top, Leggin, Cosmetics
- Login/Profile link
- Cart icon
- Banner slider with Slick.js
- Mobile hamburger menu

**What Works:**
- Category navigation
- Login state awareness
- Mobile responsive menu

**What's Missing:**
- **Cart count badge**
- **Search bar in header**
- **Seller dashboard link**
- **Active page highlighting**

**Affected Files:**
- Template: `views/index.hbs` lines 53-142 (navigation HTML)

**New Implementation Location:**
- Component: `frontend/components/` (Header, Navigation)

---

## Feature: Footer

**Category:** UI/UX
**Status:** IMPLEMENTED
**Priority:** LOW

**Current Implementation:**
- Category links (same as nav)
- Copyright: "All rights reserved by Mrs. Mahadevi Elaiyaraja"
- Developer credit: "Designed and Developed by V scripts"

**What Works:**
- Static footer content

**What's Missing:**
- **Social media links** (Instagram, Facebook, YouTube)
- **Newsletter signup**
- **Contact information**
- **Privacy policy/Terms links**

**Affected Files:**
- Template: `views/index.hbs` lines 1960-2030

**New Implementation Location:**
- Component: `frontend/components/Footer.tsx`

---

## Feature: Banner Slider

**Category:** UI/UX
**Status:** IMPLEMENTED
**Priority:** MEDIUM

**Current Implementation:**
- Slick.js carousel
- 3 slides with:
  - Auto-playing text (typewriter effect via .js-text-type)
  - Headlines: "Isale", "Isale"
  - Subtexts: "See our Exclusive beauty collection"
  - View Collection buttons
- Arrow navigation
- Dot indicators

**What Works:**
- Carousel display
- Auto-play
- Navigation arrows
- Click-through buttons

**What's Missing:**
- **Dynamic banners** — Hardcoded, no CMS
- **Banner images** — Text only, no background images
- **Analytics tracking** — No click tracking

**Affected Files:**
- Template: `views/index.hbs` lines 265-350

**New Implementation Location:**
- Component: `frontend/components/BannerSlider.tsx`
- Consider: Swiper.js (more modern than Slick)

---

## Feature: Contact Page

**Category:** UI/UX
**Status:** IMPLEMENTED
**Priority:** LOW

**Current Implementation:**
- Store address: VSK Mahal, Veppur, Perambalur, Tamil Nadu 621717
- Email: [protected]
- Phone: [protected]
- Hours: Monday–Sunday 9AM–8PM
- Empty map iframe (no actual map)
- Static content only

**What Works:**
- Contact information display

**What's Missing:**
- **Working Google Maps embed**
- **Contact form** (send message via email)
- **WhatsApp chat button**
- **Social media links**

**Affected Files:**
- Template: `views/contact.hbs` (1000 lines)

**New Implementation Location:**
- Page: `frontend/app/contact/page.tsx`

---

## Feature: Email Notifications

**Category:** Email
**Status:** PARTIALLY IMPLEMENTED
**Priority:** HIGH

**Current Implementation:**
- OTP verification emails via Brevo
- HTML template with "Beauty Queen OTP Verification" header
- 5-minute expiry notice

**What Works:**
- OTP email delivery
- HTML email template

**What's Missing:**
- **Order confirmation email**
- **Order shipped email**
- **Order delivered email**
- **Password reset email** (for sellers)
- **Promotional emails**
- **Email templates** as separate files (currently hardcoded)

**Affected Files:**
- Service: `server/router.js` lines 24-73

**New Implementation Location:**
- Service: `backend/src/services/brevoService.ts`
- Templates: `backend/src/templates/` (separate HTML files)

---

## Feature: Error Handling

**Category:** UI/UX
**Status:** PARTIALLY IMPLEMENTED
**Priority:** MEDIUM

**Current Implementation:**
- 404 page with custom message
- Generic error handler in router (catches all errors)
- Server errors logged to console

**What Works:**
- 404 display
- Basic error catching

**What's Missing:**
- **Custom error pages** (403, 500, 503)
- **User-friendly error messages**
- **Error logging service**
- **Error recovery suggestions**
- **Graceful degradation**

**Affected Files:**
- Route: `server/router.js` lines 2003-2005
- Template: `views/404.hbs` (83 lines)

**New Implementation Location:**
- Pages: `frontend/app/not-found.tsx`, `frontend/app/error.tsx`, `frontend/app/global-error.tsx`

---

## Feature: Responsive Design

**Category:** UI/UX
**Status:** PARTIALLY IMPLEMENTED
**Priority:** MEDIUM

**Current Implementation:**
- ThemeFisher "BigSale" theme
- Bootstrap grid system
- Mobile hamburger menu
- Product grid responsive columns

**What Works:**
- Basic mobile layout
- Hamburger menu
- Responsive product grid

**What's Missing:**
- **Mobile-optimized checkout** form
- **Touch-friendly** size selector
- **Mobile search** experience
- **Image lazy loading**

**Affected Files:**
- Theme: `views/assets/` (ThemeFisher BigSale)
- CSS: `views/css/` (theme styles)

**New Implementation Location:**
- Framework: Next.js responsive utilities
- CSS: Tailwind CSS or CSS Modules

---

## Feature: Performance

**Category:** UI/UX
**Status:** NOT IMPLEMENTED
**Priority:** MEDIUM

**Current Implementation:**
- Compression middleware enabled
- Static file serving via Express

**What's Missing:**
- **Image lazy loading**
- **Code splitting**
- **CDN for static assets**
- **Browser caching headers**
- **Minification** (handled by build tools)
- **Database query optimization** (no indexes)
- **Connection pooling tuning**

**Affected Files:**
- Server: `app.js`, `server/router.js`

**New Implementation Location:**
- Next.js: Automatic code splitting, image optimization
- Backend: Add caching headers, query optimization
