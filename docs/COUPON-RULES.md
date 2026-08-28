# Coupon Rules

## Coupon Types

### PERCENTAGE
- Discount is a percentage of the subtotal (after product discounts)
- Example: 10% off → discount = subtotal * 10 / 100

### FIXED_AMOUNT
- Discount is a fixed amount in INR
- Example: ₹100 off → discount = 100

## Validation Conditions

When applying a coupon, ALL conditions must pass:

1. **Coupon exists** - Code must match an existing coupon
2. **Coupon active** - `active` field must be true
3. **Date validity** - Current date must be between `startsAt` and `expiresAt`
4. **Usage limit** - `usedCount` must be less than `usageLimit` (if set)
5. **Per-user limit** - User's usage count must be less than `perUserLimit` (if set)
6. **Minimum order** - Subtotal (after product discounts) must be >= `minPurchase`
7. **Maximum discount** - Calculated discount is capped at `maxDiscount` (if set)

If ANY condition fails, the coupon is rejected with an appropriate error message.

## Coupon Application Flow

1. Frontend submits `couponCode` with checkout
2. Backend validates the coupon via `PricingService.calculateCouponDiscount()`
3. Discount is calculated and applied to the order total
4. Coupon usage is recorded atomically with order creation

## Atomicity

Coupon usage is consumed when the order is created (within the same transaction).
If payment fails:
- UPI: Coupon is released in the `handlePaymentFailed` webhook handler
- COD: Coupon remains consumed (order is placed)

## Per-User Limits

Each user can only use a coupon up to `perUserLimit` times (default: 1).
Usage is tracked via the `CouponUsage` table.

## Admin Management

- Admin can create, update, delete, and toggle coupons
- Admin can view usage statistics
- Admin routes require `ADMIN` role
