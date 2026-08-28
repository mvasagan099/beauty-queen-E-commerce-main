# Tax/GST Rules

## Current Configuration

Tax is configurable via `SiteConfig` table with key `tax`.

### Default: No Tax

If no tax configuration exists, tax is always ₹0.

### Configurable Options

```json
{
  "gstRate": 12,
  "gstType": "CGST_SGST",
  "inclusive": false
}
```

- `gstRate`: GST percentage (e.g., 12 for 12%)
- `gstType`: Type of GST (CGST_SGST, IGST, etc.)
- `inclusive`: Whether tax is already included in product prices

## Calculation

1. If `inclusive` is true → Tax is already included, no additional calculation
2. If `inclusive` is false → Tax = amount * gstRate / 100

## Tax Amount

Tax is calculated on the amount after product discounts and coupon discounts.

## Invoice Preparation

The system prepares invoice data with:
- Invoice number (auto-generated)
- Order ID
- Customer details
- Product list with quantities and prices
- Discount amount
- Tax amount
- Shipping amount
- Total amount
- Payment information

DECISION REQUIRED:
- GSTIN of the business
- HSN/SAC codes for products
- Place of supply rules
- E-invoicing compliance
- GST return filing integration

Do not generate legally compliant tax invoices until the required business/tax information is available.
