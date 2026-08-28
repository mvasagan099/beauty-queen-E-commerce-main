# Incident Response

How the Beauty Queen e-commerce team detects, responds to, and learns from
production incidents.

---

## Incident Lifecycle

```
Detect → Assess → Contain → Recover → Verify → Communicate → Postmortem
```

---

## 1. Detect

Incidents are detected through monitoring and alerting (see
[PRODUCTION-OPERATIONS.md → Monitoring](PRODUCTION-OPERATIONS.md)):

- Health check failures (`/api/health`, `/api/health/ready`, worker probes).
- Alert thresholds: high 5xx rate, high API latency (p95/p99), DB/Redis
  unavailable, queue backlog, worker down, payment failure spike, disk almost
  full, memory pressure, backup failure.
- `/api/metrics` — order/payment/queue anomalies.

### Alert Priority Classification

| Priority | Meaning | Example |
|----------|---------|---------|
| **CRITICAL** | Immediate action required | Database or Redis unavailable; payment/webhook failure spike; backup failure going unnoticed |
| **HIGH** | Respond promptly | High 5xx/latency, queue backlog, worker down, disk almost full |
| **MEDIUM** | Schedule a fix | Memory pressure, non-blocking errors, repeated WARN |
| **LOW** | Informational | Harmless warnings, cosmetic issues |

Avoid alerting on every harmless warning — alert fatigue hides real issues.
Critical alerts must correspond to issues requiring immediate action.

---

## 2. Assess

1. Identify the affected service and scope (which customers, which flows).
2. Check logs: `docker-compose logs -f api|worker|web`, and the request-ID
   correlation for the affected requests.
3. Check health and metrics: `/api/health`, `/api/metrics`.
4. Determine severity using the priority table above.

---

## 3. Contain

Stop the blast radius before fixing root cause. Examples:

- **Database / Redis down**: `docker-compose restart mysql|redis`; if unstable,
  stop dependent services to prevent cascading failures / corrupted writes.
- **Payment provider outage**: keep orders in pending state; do not fabricate
  success or corrupt order state.
- **Bad deployment**: roll back the affected image immediately
  (see [ROLLBACK-PLAN.md](ROLLBACK-PLAN.md)).

---

## 4. Recover

Follow the relevant playbook in
[DISASTER-RECOVERY.md](DISASTER-RECOVERY.md) or
[RUNBOOK.md](RUNBOOK.md) (API down, worker down, Redis down, database down,
queue stuck, payment failures, high CPU/memory, disk full, failed deployment).

---

## 5. Verify

Confirm recovery:

- Health: `/api/health` → `ok`.
- Metrics: `/api/metrics` reflects normal order/payment/queue levels.
- Business validity: orders/payments/inventory consistent; reconcile with
  Razorpay and inventory movements.
- Smoke test critical flows (auth, products, cart, checkout, payments webhook).

---

## 6. Communicate

### Responsibility

| Area | Responsible |
|------|-------------|
| Application (API / web / worker) | Application engineer on call |
| Database | DBA / application engineer |
| Payments (Razorpay) | Payments owner / on-call engineer |
| Infrastructure (host, network) | Infrastructure owner |
| Customer communication | Support / communications owner |

- **Internal**: use the incident channel; share a concise status (what, scope,
  impact, ETA if known).
- **Customer-facing**: only publish externally when it truly affects customers
  (e.g. prolonged downtime, data exposure). Do **not** expose internal incident
  details (root cause, internal hostnames, secrets) to customers.

---

## 7. Postmortem

For serious (CRITICAL / HIGH with customer impact) incidents, record:

- What happened
- Impact (customers, orders, payments, revenue)
- Timeline (all timestamps)
- Root cause
- How it was detected
- Resolution
- Preventive actions (with owners)

Apply preventive actions and add regression coverage / runbook updates.

---

## Roles

- **Incident Commander**: coordinates the response, owns communication.
- **On-call engineer**: drives detection, containment, recovery.
- **Subject-matter experts**: DB, payments, infrastructure as needed.

Keep the list small — a single commander avoids confusion.
