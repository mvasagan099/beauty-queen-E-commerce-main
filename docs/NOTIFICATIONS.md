# Notifications System

## Overview

The application uses a dual notification system:

1. **Email notifications** - Sent via Brevo through BullMQ background jobs
2. **In-app notifications** - Stored in the database and accessible via API

## Architecture

```
Domain Event (Order/Payment/Return/Refund)
    ↓
NotificationsService (event dispatcher)
    ↓
├── Email Queue (BullMQ) → EmailProcessor → EmailService → Brevo API
└── Notifications Queue (BullMQ) → NotificationProcessor → InAppNotificationService → Database
```

## Key Design Principles

1. **Non-blocking**: Notifications are queued AFTER the database transaction commits. Notification failures never block or fail the primary business operation.
2. **Idempotent**: Each email job has a unique `eventId` (UUID) to prevent duplicate sends.
3. **Retries**: Failed jobs retry up to 3 times with exponential backoff (2s, 4s, 8s).

## Email Events

| Event | When |
|---|---|
| `OTP_REQUESTED` | User requests login OTP |
| `ORDER_CREATED` | Order payment confirmed |
| `PAYMENT_SUCCESS` | Payment captured successfully |
| `PAYMENT_FAILED` | Payment verification failed |
| `ORDER_CONFIRMED` | Order confirmed after payment |
| `ORDER_PROCESSING` | Order status changed to Processing |
| `ORDER_SHIPPED` | Order shipped with tracking |
| `ORDER_DELIVERED` | Order delivered |
| `ORDER_CANCELLED` | Order cancelled |
| `RETURN_REQUESTED` | Customer requests return |
| `RETURN_APPROVED` | Admin approves return |
| `RETURN_REJECTED` | Admin rejects return |
| `REFUND_INITIATED` | Refund process started |
| `REFUND_COMPLETED` | Refund completed successfully |

## In-App Notification Types

| Type | Description |
|---|---|
| `ORDER_UPDATE` | Order status changes |
| `PAYMENT_UPDATE` | Payment status changes |
| `PROMOTIONAL` | Marketing messages |
| `SYSTEM` | System announcements |

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/notifications` | JWT | List user notifications (paginated) |
| `GET` | `/notifications/unread-count` | JWT | Get unread notification count |
| `PATCH` | `/notifications/:id/read` | JWT | Mark single notification as read |
| `PATCH` | `/notifications/read-all` | JWT | Mark all notifications as read |

## Frontend

- **NotificationBell**: Bell icon in header with unread count badge
- **NotificationList**: Dropdown panel showing recent notifications
- Supports mark-as-read on click and mark-all-as-read button
- **Account Notifications page**: `/account/notifications` — full paginated history with mark-read on click and mark-all-read (uses `useNotifications`, `useUnreadNotificationCount`, `useMarkNotificationRead`, `useMarkAllNotificationsRead`)

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `BREVO_API_KEY` | Yes | Brevo transactional email API key |
| `EMAIL_SENDER_NAME` | No | Sender name (default: "Beauty Queen") |
| `EMAIL_SENDER_EMAIL` | No | Sender email (default: "noreply@beautyqueen.com") |
| `REDIS_HOST` | Yes | Redis host for BullMQ |
| `REDIS_PORT` | Yes | Redis port (default: 6379) |

## Security Notes

- Brevo API key is NEVER exposed via `NEXT_PUBLIC_*` env vars
- OTP values are never logged
- OTP values are never included in API responses after generation
- Email payloads never contain passwords, JWTs, or payment secrets

---

# Phase 17 — New Email Events (2026-08-28)

## Support-ticket events (new `EmailEventType`s)

| Event | When | eventId |
|-------|------|---------|
| `SUPPORT_TICKET_CREATED` | Ticket created | `support-ticket:{ticketId}:created` |
| `SUPPORT_TICKET_REPLIED` | Admin public reply | `support-ticket:{ticketId}:replied` |
| `SUPPORT_TICKET_RESOLVED` | Admin resolves ticket | `support-ticket:{ticketId}:resolved` |
| `SUPPORT_TICKET_CLOSED` | Ticket closed (customer or admin) | `support-ticket:{ticketId}:closed` |

Internal admin notes never trigger emails. All tickets carry a `BQ-TKT-00001` style number in the subject body.

## Alert events

| Event | When | eventId |
|-------|------|---------|
| `BACK_IN_STOCK` | Stock alert scan finds stock | `back-in-stock:{productId}` |
| `PRICE_DROP` | Price alert scan finds `price <= watchedPrice` | `price-drop:{productId}` |

Alert emails only go to opt-in subscribers (stock/price alerts are opt-in by creation; no marketing without `promotional` preference).

## Consent gates

- `promotional=true` (NotificationPreference) is required for abandoned-cart reminders.
- Order/payment emails follow the payment/order lifecycle regardless of `orderUpdates`/`paymentUpdates` defaults (documented defaults exist in `preferences.service.ts`).
