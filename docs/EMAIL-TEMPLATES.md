# Email Templates

## Template Structure

```
apps/api/src/notifications/templates/
├── index.ts              # Template registry and renderer
├── otp/
│   └── otp.ts            # OTP verification code
├── order/
│   ├── order-created.ts  # Order confirmation
│   ├── order-status-update.ts  # Status changes (Processing, Shipped, Delivered)
│   └── order-cancelled.ts      # Order cancellation
├── payment/
│   ├── payment-success.ts      # Payment confirmed
│   └── payment-failed.ts       # Payment failed
├── shipping/
│   └── shipping-update.ts      # Shipping with tracking info
└── returns/
    ├── return-requested.ts     # Return request received
    ├── return-approved.ts      # Return approved
    ├── return-rejected.ts      # Return rejected
    ├── refund-initiated.ts     # Refund started
    └── refund-completed.ts     # Refund completed
```

## Template Design

All templates follow the Beauty Queen brand guidelines:
- **Primary color**: Pink (#ec4899)
- **Background**: Light pink (#fdf2f8) for cards
- **Success indicator**: Green (#22c55e) border
- **Error indicator**: Red (#ef4444) border
- **Font**: Arial, sans-serif
- **Max width**: 600px

## Template Functions

Each template exports a function that takes data and returns HTML:

```typescript
function orderCreatedTemplate(data: {
  orderId: number;
  username: string;
  productName: string;
  price: number;
  quantity: number;
  total: number;
  paymentMethod: string;
}): string
```

## Adding New Templates

1. Create a new `.ts` file in the appropriate subdirectory
2. Export a function that accepts a data object and returns HTML string
3. Add the event type to `EmailEventType` in `types/notification.types.ts`
4. Register the template in `templates/index.ts`

## Security

- Templates never receive sensitive data (passwords, tokens, payment secrets)
- OTP template does not log the OTP value
- Tracking URLs are validated before inclusion
