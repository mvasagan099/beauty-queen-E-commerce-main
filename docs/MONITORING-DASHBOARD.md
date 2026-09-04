# Monitoring Dashboard

## Overview

The Beauty Queen E-Commerce application provides built-in observability through
structured logging, health endpoints, and a metrics endpoint. This document
describes how to set up a production monitoring dashboard.

## Application Metrics

### Endpoints

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `GET /api/health` | None | Full health check (DB + Redis) |
| `GET /api/health/live` | None | Liveness probe (always 200) |
| `GET /api/health/ready` | None | Readiness probe (DB check) |
| `GET /api/metrics` | Admin JWT | Operational + business metrics |
| `GET /api/metrics/queues` | Admin JWT | BullMQ queue depth metrics |

### Application Dashboard

| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| Requests/minute | Nginx access log | < 1 req/min indicates outage |
| HTTP 4xx rate | Nginx access log | > 10% of total requests |
| HTTP 5xx rate | Nginx access log | > 1% of total requests |
| API latency (p95) | Nginx access log | > 2000ms |
| Health check status | /api/health | status != "ok" |

### Database Dashboard

| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| Active connections | MySQL SHOW STATUS | > 80 of 100 max |
| Slow queries | MySQL slow_query_log | > 0 per minute |
| Query latency | Application logs | > 500ms average |
| Storage usage | Disk monitoring | > 80% capacity |
| Replication lag | If applicable | > 5s |

### Redis Dashboard

| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| Memory usage | redis-cli INFO memory | > 200MB of 256MB limit |
| Connected clients | redis-cli INFO clients | > 50 |
| Operations/sec | redis-cli INFO stats | Monitor for anomalies |
| Evicted keys | redis-cli INFO stats | > 0 indicates memory pressure |

### BullMQ Dashboard

| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| Waiting jobs | /api/metrics/queues | > 100 indicates backlog |
| Active jobs | /api/metrics/queues | Monitor for stuck jobs |
| Failed jobs | /api/metrics/queues | > 0 requires investigation |
| Completed jobs | /api/metrics/queues | Monitor throughput |
| Delayed jobs | /api/metrics/queues | Growing delay indicates issues |

### Business Dashboard

| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| Orders today | /api/metrics | 0 for > 2 hours during business hours |
| Payment failures | /api/metrics | > 5 per hour |
| Successful payments | /api/metrics | Monitor for trends |
| Cancellations | /api/metrics | > 20% of orders |
| Refunds | /api/metrics | > 5% of payments |

## Alerting Rules

### Critical (Page immediately)

- API health check failing for > 2 minutes
- MySQL unreachable
- 5xx error rate > 5% for > 5 minutes
- Payment processing completely down

### Warning (Notify team)

- API response time > 3s for > 5 minutes
- Redis unavailable (fallback to memory)
- BullMQ failed jobs > 10
- Disk usage > 80%
- Memory usage > 80%

### Informational (Log only)

- New deployment completed
- Database migration applied
- Backup completed successfully

## Log Aggregation

Production logs are structured JSON. Configure a log aggregator (e.g., ELK,
Datadog, CloudWatch Logs) to parse the following fields:

```json
{
  "level": "info",
  "time": "2026-09-04T12:00:00.000Z",
  "requestId": "uuid-v4",
  "method": "GET",
  "url": "/api/products",
  "statusCode": 200,
  "durationMs": 45
}
```

### Key Log Patterns to Monitor

| Pattern | Severity | Action |
|---------|----------|--------|
| `http request failed` | error | Investigate endpoint |
| `Redis unavailable` | warn | Check Redis health |
| `Redis command failed` | warn | Check Redis health |
| `Database health check failed` | error | Check MySQL health |
| `FATAL` in startup logs | critical | Check env configuration |

## Recommended Tools

For a minimal self-hosted setup:
- **Prometheus** for metrics collection
- **Grafana** for dashboards
- **Loki** for log aggregation
- **Uptime Kuma** for external uptime monitoring

For managed services:
- **Datadog** or **New Relic** for APM
- **Sentry** for error tracking
- **Betterstack** or **Logtail** for log management

## Dashboard Access

| Service | URL | Auth |
|---------|-----|------|
| Grafana | https://grafana.your-domain.com | SSO / local account |
| Prometheus | Internal only | Network restriction |
| Uptime Kuma | https://status.your-domain.com | Password |
