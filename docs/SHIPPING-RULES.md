# Shipping Rules

## Current Configuration

Shipping is configurable via `SiteConfig` table with key `shipping`.

### Default: Free Shipping

If no shipping configuration exists, shipping is always free (₹0).

### Configurable Options

```json
{
  "freeShippingThreshold": 500,
  "baseCharge": 50,
  "zoneOverrides": {
    "600": 0,
    "601": 25,
    "110": 75
  }
}
```

- `freeShippingThreshold`: Orders above this amount get free shipping
- `baseCharge`: Default shipping charge
- `zoneOverrides`: Pincode prefix-based overrides (first 3 digits)

## Calculation

1. If subtotal >= `freeShippingThreshold` → Free shipping
2. If pincode matches a zone override → Use zone charge
3. Otherwise → Use `baseCharge`

## Future Enhancements

DECISION REQUIRED:
- Carrier integration (Shiprocket, Delhivery, etc.)
- Weight-based shipping
- Dimensional weight calculations
- Express vs standard shipping options
- International shipping rules

## Address Validation

At checkout, the following are validated:
- Pincode (6 digits)
- District (required)
- Address (minimum 5 characters)

Future delivery-zone logic should be placed in the `ShippingService`.
