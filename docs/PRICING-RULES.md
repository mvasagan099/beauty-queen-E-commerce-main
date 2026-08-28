# Pricing Rules

## Calculation Order

All final price calculations go through the centralized `PricingService`.

```
Product price
      ↓
Quantity
      ↓
Product discount (MRP - Price)
      ↓
Coupon
      ↓
Subtotal after discount & coupon
      ↓
Shipping
      ↓
Tax/GST
      ↓
Final total
```

## Rules

1. **Backend is the source of truth.** Frontend never submits authoritative pricing values.
2. **Prices are queried from the database** at checkout time, never trusted from client.
3. **Product discounts** are computed as `MRP - selling price`. No separate discount model.
4. **Coupon discounts** are calculated on the subtotal after product discounts.
5. **Shipping** is calculated after coupon discounts are applied.
6. **Tax/GST** is calculated on the amount after product discounts and coupon discounts, but before shipping.
7. **All monetary values** are stored as `Decimal(10,2)` in the database.
8. **Order snapshots** preserve the exact pricing at time of purchase.

## Frontend Input

The frontend may submit:
- `couponCode`
- `productId`
- `quantity`
- `shippingAddress`

The frontend must NOT submit:
- `subtotal`
- `discount`
- `shipping`
- `tax`
- `total`

## Backend Recalculation

Every checkout request triggers a full recalculation through `PricingService.calculatePricing()`:

1. Validates product existence and prices from DB
2. Calculates product-level discounts (MRP vs price)
3. Validates and applies coupon (if provided)
4. Calculates shipping based on config
5. Calculates tax based on config
6. Returns final total

## Configuration

Shipping and tax rates are stored in the `SiteConfig` table:

- `shipping`: `{ freeShippingThreshold, baseCharge, zoneOverrides }`
- `tax`: `{ gstRate, gstType, inclusive }`
