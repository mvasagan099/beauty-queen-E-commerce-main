# Performance Baseline

Expected baseline metrics for the Beauty Queen E-Commerce application in production/staging environments. All targets should be measured after the first deployment.

---

## Target Baselines

### Homepage

- Response time: < 500ms (SSR) / < 100ms (static cache)
- TTFB: < 300ms

### Product Listing

- Response time: < 300ms
- Database query time: < 50ms

### Product Detail

- Response time: < 400ms
- Database query time: < 30ms

### Search

- Response time: < 500ms
- Database query time: < 100ms

### Cart Operations

- Add to cart: < 200ms
- Get cart: < 150ms

### Checkout

- Create order: < 1s
- Payment initiation: < 2s (includes Razorpay API call)

### Admin Dashboard

- Dashboard load: < 1s
- Order list: < 500ms

### API Health

- `/api/health/live`: < 50ms
- `/api/health/ready`: < 100ms

---

## Database Performance

- Connection pool: 10-100 connections
- Query latency: < 50ms average
- Slow query threshold: 2 seconds (MySQL `slow_query_log`)

---

## Infrastructure Limits

| Service  | CPU   | RAM    |
|----------|-------|--------|
| MySQL    | 2     | 1GB    |
| Redis    | 0.5   | 256MB  |
| API      | 1     | 512MB  |
| Web      | 1     | 512MB  |
| Worker   | 0.5   | 256MB  |
| Nginx    | 0.5   | 256MB  |

---

## How to Measure

After deploying to staging/production, run:

```bash
# Health check latency
time curl -sf http://localhost/api/health

# Product listing (needs auth token or test endpoint)
time curl -sf http://localhost/api/products

# Homepage
time curl -sf http://localhost/
```

For proper load testing, use tools like k6, artillery, or wrk.
