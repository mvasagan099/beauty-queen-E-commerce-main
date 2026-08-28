# Background Jobs

## Overview

Background jobs handle tasks that should not block the main API request-response cycle.

## Job Types

### 1. Email Jobs

**Queue**: `email`
**Worker**: `EmailProcessor`
**Purpose**: Send transactional emails via Brevo API

```
Domain Event → NotificationsService → Email Queue → EmailProcessor → Brevo API
```

### 2. In-App Notification Jobs

**Queue**: `notifications`
**Worker**: `NotificationProcessor`
**Purpose**: Create notification records in the database

```
Domain Event → NotificationsService → Notifications Queue → NotificationProcessor → Database
```

### 3. Image Processing (Reserved)

**Queue**: `image-processing`
**Worker**: `ImageProcessor` (stub)
**Purpose**: Asynchronous image processing with Sharp

Currently a stub. Only activate if image processing becomes slow enough to warrant async handling.

## Job Lifecycle

```
Created → Waiting → Active → Completed
                    ↓
                  Failed → Retry (exponential backoff)
                    ↓
                  Failed (max retries reached) → Dead Letter
```

## Failure Behavior

| Component | Failure Impact | Recovery |
|---|---|---|
| Email job fails | Order/payment still succeeds | Automatic retry (3 attempts) |
| In-app notification fails | Order/payment still succeeds | Automatic retry (3 attempts) |
| Redis connection lost | Jobs queue in Redis; falls back to in-memory for OTP | Auto-reconnect |
| Worker restarts | Pending jobs resume from Redis | No job loss |
| Brevo API down | Emails delayed | Retry with backoff |

## Idempotency

- Each email job has a unique `eventId` (UUID)
- BullMQ uses `jobId: eventId` to prevent duplicate jobs
- Payment webhooks check `webhookProcessed` flag before re-processing
- Order status changes check current status before queuing notifications

## Configuration

### Default Job Options

```typescript
{
  removeOnComplete: 50,    // Keep last 50 completed jobs
  removeOnFail: 20,        // Keep last 20 failed jobs
  attempts: 3,             // Max retry attempts
  backoff: {
    type: 'exponential',
    delay: 2000,           // Initial delay: 2s
  },
}
```

### Per-Job Overrides

- OTP emails: Priority 1 (highest)
- Order notifications: Priority 5 (default)
- In-app notifications: Priority 3

## Development

### Redis Fallback

When Redis is unavailable, the `RedisService` uses an in-memory Map for:
- OTP storage (with TTL)
- Rate limiting

This allows development without Redis running.

### Monitoring

```typescript
// Get job status
const jobs = await emailQueue.getJobs(['waiting', 'active', 'completed', 'failed']);
```

Do NOT expose Redis directly to the public internet in production.

---

# Phase 17 — Scheduled Jobs (2026-08-28)

All jobs live in `apps/api/src/scheduled/scheduled-jobs.service.ts` and run within `RedisService.withLock(<job-id>, fn)` so both `main.ts` and `worker.ts` can boot the same `AppModule` without double execution.

| Job | Schedule | Lock key | What it does |
|-----|----------|----------|--------------|
| Alert scanning (stock/price) | `*/15 * * * * *` | `scheduled-alert-scan` | Finds WT/G TRIGGERABLE stock & price alerts; checks `AlertsService.hasStock` / current price; sends idempotent emails; marks TRIGGERED |
| Abandoned-cart reminder | `30 2 * * *` | `scheduled-abandoned-carts` | Cart items with no activity for 24–72h; requires `promotional` consent, ≥1 in-stock non-deleted item, and no reminder sent in the last 7 days → `notifyCartReminder` |
| Coupon expiry | `30 0 * * *` | `scheduled-coupon-expiry` | `coupon.updateMany({ active: true, expiresAt: { lt: now } }, { active: false })` |

## Failure modes (documented)

- **Redis down**: `withLock` falls back to an in-memory Map guarded by a per-process lock — safe in a single-process run, but a second worker could overlap. Acceptable in dev; requires shared Redis in production (already the deployment default).
- **Idempotency**: emails are gated by deterministic eventIds (`cart-reminder:{cartItemId}`, `back-in-stock:{id}`, `price-drop:{id}`) inside the BullMQ queue dedupe window, so retries do not double-send.

Monitoring: existing queue dashboard probes via `/health`; job outcomes are structured-logged by the `Logger` in each runner.
