# Return Rules

## Eligibility

A return can be requested when ALL conditions are met:

1. **Order belongs to user** - The requesting user owns the order
2. **Order delivered** - Order status must be `Delivered`
3. **Not already returned** - No existing active return request for this order
4. **Not cancelled/refunded** - Order is not in `Cancelled` or `Refunded` status

## Return Statuses

```
REQUESTED → APPROVED → PICKUP_PENDING → RECEIVED → COMPLETED
         ↘ REJECTED
APPROVED → CANCELLED
PICKUP_PENDING → CANCELLED
```

## Return API

### Customer
- `POST /api/returns` - Request a return (requires orderId, reason)
- `GET /api/returns` - List my returns
- `GET /api/returns/:id` - Get return details

### Admin
- `GET /api/returns/admin` - List all returns
- `PATCH /api/returns/admin/:id` - Update return status

## Status Transitions

| Current Status | Allowed Next Statuses |
|---------------|----------------------|
| REQUESTED | APPROVED, REJECTED |
| APPROVED | PICKUP_PENDING, COMPLETED, CANCELLED |
| PICKUP_PENDING | RECEIVED, CANCELLED |
| RECEIVED | COMPLETED |
| COMPLETED | (terminal) |
| REJECTED | (terminal) |
| CANCELLED | (terminal) |

## Return Window

DECISION REQUIRED:
- How many days after delivery can a return be requested?
- Default recommendation: 7-30 days

## Inventory After Return

When a return is marked as `RECEIVED`:
- Admin inspects the item
- If eligible for resale → stock can be restored manually
- Stock is NOT automatically restored on return request

## Partial Refunds

For orders with multiple items:
- Each order row is a separate item
- Returns are at the order-item level
- Refund amount = item subtotal (price * quantity)

## Notifications

Send notifications (when configured):
- Return requested → Admin notification
- Return approved → Customer email
- Return rejected → Customer email with reason
- Return completed → Customer email
