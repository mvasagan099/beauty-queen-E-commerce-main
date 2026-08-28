# Background Jobs & Queues

## Queue Architecture

The application uses BullMQ with Redis for background job processing.

## Queue Names

| Queue | Purpose | Worker |
|---|---|---|
| `email` | Send transactional emails via Brevo | `EmailProcessor` |
| `notifications` | Create in-app notifications | `NotificationProcessor` |
| `image-processing` | Async image processing (reserved) | `ImageProcessor` (stub) |

## Job Flow

```
API Request
    ↓
Database Transaction (Prisma)
    ↓
Transaction Commits
    ↓
Queue Job Added (BullMQ)
    ↓
Return Success to Client
    ↓
Worker Picks Up Job
    ↓
Process & External Service Call
    ↓
On Failure: Retry with Backoff
```

## Email Job Payload

```typescript
interface EmailJobPayload {
  eventId: string;    // UUID for idempotency
  type: EmailEventType;
  to: string;         // Recipient email
  data: Record<string, any>;  // Template data
}
```

## In-App Notification Job Payload

```typescript
interface InAppNotificationPayload {
  userId: number;
  type: InAppNotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
}
```

## Retry Policy

- **Max Attempts**: 3
- **Backoff Type**: Exponential
- **Initial Delay**: 2000ms (2s)
- **Sequence**: 2s → 4s → 8s

## Failed Jobs

Failed jobs are retained (up to 20) for inspection via the BullMQ dashboard or Redis. Completed jobs are removed (up to 50 retained).

## Queue Monitoring

BullMQ provides monitoring through:
- `getJobs(['waiting', 'active', 'completed', 'failed'])` API
- Redis inspection (do not expose Redis to public internet)
- BullMQ Board dashboard (development only)

## Redis Configuration

- **Host**: `REDIS_HOST` env var (default: `localhost`)
- **Port**: `REDIS_PORT` env var (default: `6379`)
- **In-memory fallback**: If Redis is unavailable, `RedisService` falls back to a Map-based store (development only)
- **Persistence**: Redis uses AOF persistence with Docker volume in production

## Security

- Redis is NOT publicly exposed
- Redis uses authentication in production
- No long-term secrets stored in Redis (OTP values have 5-minute TTL)
