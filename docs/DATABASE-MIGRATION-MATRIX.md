# Database Migration Matrix

**Date:** 2026-08-26
**Scope:** Complete comparison of Legacy MySQL tables vs Prisma schema

---

## 1. Table-Level Comparison

| Legacy Table | Prisma Model | Status | Notes |
|-------------|-------------|--------|-------|
| `products` | `Product` | MIGRATED | Added sellerId, deletedAt, createdAt, updatedAt |
| `orders` | `Order` | MIGRATED | Added checkoutId, userId, sellerId, paymentStatus, tracking fields |
| `seller` | `Seller` | MIGRATED | Password now hashed, added isActive, removed repassword |
| `cust` | `User` | REPLACED | Completely new schema (id, email, name, phone, role) |
| — | `RefreshToken` | NEW | JWT refresh token storage |
| — | `CartItem` | NEW | Server-side cart (replaces cookie) |
| — | `Address` | NEW | Saved addresses |
| — | `Review` | NEW | Product reviews with moderation |
| — | `WishlistItem` | NEW | Wishlist functionality |
| — | `Coupon` | NEW | Discount codes |
| — | `CouponUsage` | NEW | Coupon usage tracking |
| — | `Payment` | NEW | Payment records |
| — | `AuditLog` | NEW | System audit trail |
| — | `OrderStatusHistory` | NEW | Status transition tracking |
| — | `ReturnRequest` | NEW | Return requests |
| — | `Refund` | NEW | Refund records |
| — | `Notification` | NEW | In-app notifications |
| — | `NotificationPreference` | NEW | Notification preferences |
| — | `SiteConfig` | NEW | Dynamic site configuration |

---

## 2. Field-Level Comparison: `products` Table

| Legacy Column | Type | Prisma Field | Type | Status |
|--------------|------|-------------|------|--------|
| `id` | INT AUTO_INCREMENT | `id` | Int @id @default(autoincrement()) | MIGRATED |
| `name` | VARCHAR(100) | `name` | String @db.VarChar(100) | MIGRATED |
| `price` | INT | `price` | Int? | MIGRATED |
| `description` | TEXT | `description` | String? @db.Text | MIGRATED |
| `image` | LONGBLOB (stores path string) | `image` | String? | MIGRATED |
| `mrp` | INT | `mrp` | Int? | MIGRATED |
| `quantity` | INT | — | Computed from sizes | REPLACED |
| `ptype` | VARCHAR(100) | `ptype` | String? @db.VarChar(100) | MIGRATED |
| `image1` | LONGBLOB (stores path string) | `image1` | String? | MIGRATED |
| `image2` | LONGBLOB (stores path string) | `image2` | String? | MIGRATED |
| `image3` | LONGBLOB (stores path string) | `image3` | String? | MIGRATED |
| `image4` | LONGBLOB (stores path string) | `image4` | String? | MIGRATED |
| `size_s` | INT | `sizeS` | Int? | MIGRATED |
| `size_m` | INT | `sizeM` | Int? | MIGRATED |
| `size_l` | INT | `sizeL` | Int? | MIGRATED |
| `size_xl` | INT | `sizeXl` | Int? | MIGRATED |
| `size_xxl` | INT | `sizeXxl` | Int? | MIGRATED |
| — | — | `sellerId` | Int? | NEW |
| — | — | `deletedAt` | DateTime? | NEW |
| — | — | `createdAt` | DateTime @default(now()) | NEW |
| — | — | `updatedAt` | DateTime @updatedAt | NEW |

### Missing Indexes on Product

| Column | Index Status | Impact |
|--------|-------------|--------|
| `ptype` | NO INDEX | Category filtering does full table scan |
| `price` | NO INDEX | Price sorting/filtering slow |
| `deletedAt` | NO INDEX | Soft delete filter on every query slow |
| `sellerId` | HAS INDEX (implicit FK) | OK |

---

## 3. Field-Level Comparison: `orders` Table

| Legacy Column | Type | Prisma Field | Type | Status |
|--------------|------|-------------|------|--------|
| `id` | INT AUTO_INCREMENT | `id` | Int @id @default(autoincrement()) | MIGRATED |
| `productid` | INT NOT NULL | `productId` | Int | MIGRATED |
| `name` | VARCHAR(255) | `name` | String | MIGRATED |
| `size` | VARCHAR(50) | `size` | String | MIGRATED |
| `price` | DECIMAL(10,2) | `price` | Decimal @db.Decimal(10, 2) | MIGRATED |
| `quantity` | INT | `quantity` | Int | MIGRATED |
| `subtotal` | DECIMAL(10,2) | `subtotal` | Decimal @db.Decimal(10, 2) | MIGRATED |
| `username` | VARCHAR(255) | `username` | String | MIGRATED |
| `email` | VARCHAR(255) | `email` | String | MIGRATED |
| `address` | TEXT | `address` | String @db.Text | MIGRATED |
| `pincode` | VARCHAR(20) | `pincode` | String | MIGRATED |
| `district` | VARCHAR(100) | `district` | String | MIGRATED |
| `landmark` | VARCHAR(255) | `landmark` | String? | MIGRATED |
| `payment_method` | VARCHAR(50) | `paymentMethod` | String | MIGRATED |
| `status` | VARCHAR(50) DEFAULT 'Pending' | `status` | OrderStatus @default(Pending) | IMPROVED |
| `order_date` | TIMESTAMP DEFAULT CURRENT_TIMESTAMP | `orderDate` | DateTime @default(now()) | MIGRATED |
| — | — | `checkoutId` | String @unique @default(uuid()) | NEW |
| — | — | `userId` | Int? | NEW |
| — | — | `sellerId` | Int? | NEW |
| — | — | `paymentStatus` | PaymentStatus @default(PENDING) | NEW |
| — | — | `paymentId` | String? | NEW |
| — | — | `shippedAt` | DateTime? | NEW |
| — | — | `deliveredAt` | DateTime? | NEW |
| — | — | `cancelledAt` | DateTime? | NEW |
| — | — | `carrier` | String? | NEW |
| — | — | `trackingNumber` | String? | NEW |
| — | — | `trackingUrl` | String? | NEW |
| — | — | `cancelReason` | String? | NEW |
| — | — | `createdAt` | DateTime @default(now()) | NEW |
| — | — | `updatedAt` | DateTime @updatedAt | NEW |

---

## 4. Field-Level Comparison: `seller` Table

| Legacy Column | Type | Prisma Field | Type | Status |
|--------------|------|-------------|------|--------|
| `sellername` | VARCHAR | `sellername` | String | MIGRATED |
| `mobile` | VARCHAR | `mobile` | String | MIGRATED |
| `email` | VARCHAR | `email` | String | MIGRATED |
| `password` | VARCHAR (plaintext) | `password` | String? @db.VarChar(255) | IMPROVED |
| `repassword` | VARCHAR | — | Removed | IMPROVED |
| — | — | `id` | Int @id @default(autoincrement()) | NEW |
| — | — | `isActive` | Boolean @default(true) | NEW |
| — | — | `createdAt` | DateTime @default(now()) | NEW |
| — | — | `updatedAt` | DateTime @updatedAt | NEW |

---

## 5. Field-Level Comparison: `cust` → `User`

| Legacy Column | Type | Prisma Field | Type | Status |
|--------------|------|-------------|------|--------|
| `mobile` | VARCHAR | `phone` | String? | MIGRATED |
| — | — | `id` | Int @id @default(autoincrement()) | NEW |
| — | — | `email` | String @unique | NEW |
| — | — | `name` | String | NEW |
| — | — | `role` | Role @default(CUSTOMER) | NEW |
| — | — | `createdAt` | DateTime @default(now()) | NEW |
| — | — | `updatedAt` | DateTime @updatedAt | NEW |

**Note:** The legacy `cust` table was barely used — only queried for seller dashboard display. The new `User` model is a full user account system with roles.

---

## 6. Enums

| Enum | Values | Status |
|------|--------|--------|
| `Role` | CUSTOMER, SELLER, ADMIN | NEW |
| `OrderStatus` | Pending, Confirmed, Processing, Shipped, Delivered, Cancelled, Refunded | NEW (replaces free-form VARCHAR) |
| `PaymentStatus` | PENDING, PAID, FAILED, REFUNDED | NEW |
| `RazorpayPaymentStatus` | created, authorized, captured, refunded, failed, abandoned | NEW |
| `ReviewStatus` | PENDING, APPROVED, REJECTED | NEW |
| `CouponType` | FIXED, PERCENTAGE | NEW |
| `ReturnStatus` | PENDING, APPROVED, REJECTED, COMPLETED | NEW |
| `RefundStatus` | PENDING, PROCESSED, FAILED | NEW |

---

## 7. Relationships

| Relationship | Type | Status |
|-------------|------|--------|
| User → Address (1:N) | One user has many addresses | NEW |
| User → RefreshToken (1:N) | One user has many refresh tokens | NEW |
| User → CartItem (1:N) | One user has many cart items | NEW |
| User → Order (1:N) | One user has many orders | NEW |
| User → Review (1:N) | One user has many reviews | NEW |
| User → WishlistItem (1:N) | One user has many wishlist items | NEW |
| User → Notification (1:N) | One user has many notifications | NEW |
| Product → CartItem (1:N) | One product in many carts | NEW |
| Product → Order (1:N) | One product in many orders | NEW |
| Product → Review (1:N) | One product has many reviews | NEW |
| Product → WishlistItem (1:N) | One product wishlisted by many | NEW |
| Seller → Product (1:N) | One seller has many products | NEW |
| Seller → Order (1:N) | One seller has many orders | NEW |
| Order → OrderStatusHistory (1:N) | One order has status history | NEW |
| Order → Payment (1:1 via checkoutId) | Payment linked to checkout | NEW |
| Coupon → CouponUsage (1:N) | One coupon used many times | NEW |
| ReturnRequest → Refund (1:1) | Return linked to refund | NEW |
| Order → ReturnRequest (1:1) | One order can have one return | NEW |

---

## 8. Constraints & Defaults

| Feature | Legacy | New | Status |
|---------|--------|-----|--------|
| Primary keys | AUTO_INCREMENT | @id @default(autoincrement()) | MIGRATED |
| Unique constraints | None (except implicit) | email (User), code (Coupon), checkoutId (Order), token (RefreshToken) | IMPROVED |
| Default values | status='Pending' | Multiple defaults via @default() | IMPROVED |
| Foreign keys | None enforced | Prisma relations (implicit FK) | IMPROVED |
| NOT NULL | Minimal | Appropriate nullable/non-nullable | IMPROVED |
| Cascade deletes | None | Soft delete (deletedAt) | IMPROVED |

---

## 9. Migration Scripts

| Migration | File | Status |
|-----------|------|--------|
| Initial schema (baseline, Phase 17) | `prisma/migrations/20260828000000_init/` | EXISTS |
| Seed script | `apps/api/prisma/seed.js` | EXISTS |

> **Phase 17 note:** the previous incremental migration chain
> (`20260826_phase7_order_management`, `20260827_phase6_payments`,
> `20260828_phase10_order_lifecycle`, `20260828_phase11_prod_hardening`,
> `20260828_phase17_advanced_features`) only contained patches and had no
> initial migration, so a fresh `prisma migrate deploy` could not build the
> schema. It was consolidated into the single authoritative baseline above.
> Since no database has ever been provisioned and the repository has no
> commits, this squash is safe. See `docs/CURRENT-STATE-AUDIT.md`.

---

## 10. Data Migration Status

| Table | Data Migration | Status |
|-------|---------------|--------|
| products | Not automated | Must be done manually or via script |
| orders | Not automated | Must be done manually or via script |
| seller | Not automated | Password rehashing required |
| cust | Not migrated | Legacy cust table barely used |

---

## 11. Recommendations

1. **Add missing indexes** on `products.ptype`, `products.price`, `products.deletedAt`
2. **Add composite index** on `RefreshToken (userId, revoked)`
3. **Consider index** on `orders.email` for customer order lookups
4. **Consider index** on `orders.status` for admin/seller filtering
5. **Add index** on `reviews.productId` and `reviews.status` for moderation queries
6. **Legacy data migration** script needed before production deployment
