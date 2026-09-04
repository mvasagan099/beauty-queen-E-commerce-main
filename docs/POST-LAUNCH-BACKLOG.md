# Post-Launch Backlog

**Created:** 2026-09-04

---

## Issue Tracking

| ID | Issue | Severity | Area | Status | Fix Version |
|----|-------|----------|------|--------|-------------|
| PL-001 | No production server provisioned | P0 | Infrastructure | OPEN | — |
| PL-002 | No `.env.production` file created with real secrets | P0 | Configuration | OPEN | — |
| PL-003 | No DNS records configured | P0 | Infrastructure | OPEN | — |
| PL-004 | No SSL/TLS certificate provisioned | P0 | Security | OPEN | — |
| PL-005 | GitHub Actions secrets not configured (SSH keys, hosts) | P0 | CI/CD | OPEN | — |
| PL-006 | No production database backup created | P0 | Database | OPEN | — |
| PL-007 | No production monitoring configured | P1 | Observability | OPEN | — |
| PL-008 | No production logging aggregation configured | P1 | Observability | OPEN | — |
| PL-009 | Razorpay production credentials not obtained | P0 | Payments | OPEN | — |
| PL-010 | Brevo production API key not obtained | P1 | Email | OPEN | — |
| PL-011 | E2E tests not run against production | P1 | QA | OPEN | — |
| PL-012 | Image optimization CDN not configured | P2 | Performance | OPEN | — |

## Severity Definitions

- **P0**: Blocks production launch entirely
- **P1**: Should be resolved within first week
- **P2**: Can be deferred to next sprint

## Status Definitions

- **OPEN** — Not started
- **IN PROGRESS** — Actively being worked
- **BLOCKED** — Waiting on dependency
- **RESOLVED** — Fixed and verified
- **WON'T FIX** — Decision made to not address
