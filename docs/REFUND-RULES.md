# Refund Rules

## Refund Flow

```
Approved Return/Cancellation
        ↓
Refund eligibility check
        ↓
Backend creates refund record
        ↓
Razorpay Refund API call
        ↓
Refund status updated
        ↓
Order status updated to Refunded
```

## Refund Statuses

| Status | Description |
|--------|-------------|
| PENDING | Refund requested, not yet processed |
| PROCESSING | Refund submitted to Razorpay |
| COMPLETED | Refund successful |
| FAILED | Refund failed (retry possible) |

## Idempotency

- Only one active refund per checkout is allowed
- If a refund already exists (not FAILED), it is returned instead of creating a new one
- Prevents accidental duplicate refunds

## Partial Refunds

- Each order row is a separate line item
- Refund amount is calculated per order row (price * quantity)
- For multi-item orders, each item can be refunded independently
- Refund amount cannot exceed the original payment amount

## Security

1. **Customers cannot initiate refunds** - Only through the returns workflow
2. **Admin approval required** - Returns must be approved before refund
3. **Backend-only processing** - Razorpay refund API is called only from the server
4. **Amount validation** - Refund amount is always validated against the payment record
5. **Role-based access** - Admin APIs require ADMIN role

## Razorpay Integration

Refunds use the Razorpay Refund API:
- `razorpay.payments.refund(paymentId, { amount, speed: 'normal' })`
- Amount is in paise (multiply by 100)
- Provider refund ID is stored for tracking

## Coupon Handling

When a refund is processed for an order with a coupon:
- The coupon discount is NOT refunded separately
- The refund amount is the item subtotal minus coupon discount allocation
- Coupon usage count is NOT decremented on refund

## Notifications

Send notifications (when configured):
- Refund initiated → Customer email
- Refund completed → Customer email with details
- Refund failed → Admin notification
