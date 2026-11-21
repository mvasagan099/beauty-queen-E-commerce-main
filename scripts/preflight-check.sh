#!/usr/bin/env bash
# Beauty Queen E-Commerce — Production Pre-Flight Go-Live Verification Script
# Checks required secrets, security posture, and optional live endpoint probes.
#
# Usage:
#   ./scripts/preflight-check.sh [.env.production] [https://yourdomain.com]
set -euo pipefail

ENV_FILE="${1:-.env.production}"
SITE_URL="${2:-}"
FAILURES=0
WARNINGS=0

pass() { echo "  [PASS] $1"; }
warn() { echo "  [WARN] $1"; WARNINGS=$((WARNINGS + 1)); }
fail() { echo "  [FAIL] $1"; FAILURES=$((FAILURES + 1)); }

echo "=== Beauty Queen Production Pre-Flight Check ==="

if [ ! -f "$ENV_FILE" ]; then
  fail "Environment file '$ENV_FILE' not found. Copy .env.example and populate production secrets."
else
  pass "Found $ENV_FILE"
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a

  [ -n "${DATABASE_URL:-}" ] && pass "DATABASE_URL set" || fail "DATABASE_URL is empty"

  if [ "${#JWT_ACCESS_SECRET:-0}" -ge 32 ]; then
    pass "JWT_ACCESS_SECRET length >= 32"
  else
    fail "JWT_ACCESS_SECRET missing or shorter than 32 chars"
  fi

  if [ "${#JWT_REFRESH_SECRET:-0}" -ge 32 ]; then
    pass "JWT_REFRESH_SECRET length >= 32"
  else
    fail "JWT_REFRESH_SECRET missing or shorter than 32 chars"
  fi

  if [ -n "${JWT_ACCESS_SECRET:-}" ] && [ "${JWT_ACCESS_SECRET:-}" = "${JWT_REFRESH_SECRET:-}" ]; then
    fail "JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be distinct"
  fi

  if [ -n "${RAZORPAY_KEY_ID:-}" ] && [ -n "${RAZORPAY_KEY_SECRET:-}" ] && [ -n "${RAZORPAY_WEBHOOK_SECRET:-}" ]; then
    if [[ "${RAZORPAY_KEY_ID}" == rzp_test_* ]]; then
      warn "RAZORPAY_KEY_ID is a test key (rzp_test_*) — switch to rzp_live_* before public launch"
    else
      pass "Razorpay live keys & webhook secret set"
    fi
  else
    fail "Razorpay credentials (RAZORPAY_KEY_ID/KEY_SECRET/WEBHOOK_SECRET) incomplete"
  fi

  [ -n "${BREVO_API_KEY:-}" ] && pass "BREVO_API_KEY set" || warn "BREVO_API_KEY not set (OTP & order emails will not send)"
  [ -n "${REDIS_PASSWORD:-}" ] && pass "REDIS_PASSWORD set" || warn "REDIS_PASSWORD empty (recommended in production)"

  if [[ "${FRONTEND_URL:-}" == https://* ]]; then
    pass "FRONTEND_URL uses HTTPS (${FRONTEND_URL})"
  else
    warn "FRONTEND_URL does not use HTTPS (${FRONTEND_URL:-unset})"
  fi

  [ -n "${ALERT_WEBHOOK_URL:-}" ] && pass "ALERT_WEBHOOK_URL configured" || warn "ALERT_WEBHOOK_URL not set (5xx alerts disabled)"
fi

if [ -n "$SITE_URL" ]; then
  BASE="${SITE_URL%/}"
  echo ""
  echo "=== Live Endpoint Smoke Probes ($BASE) ==="
  for path in "/api/health/live" "/api/health/ready" "/"; do
    code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 10 "${BASE}${path}" || echo "000")
    if [ "$code" = "200" ]; then
      pass "GET ${path} -> HTTP 200"
    else
      fail "GET ${path} -> HTTP ${code}"
    fi
  done
fi

echo ""
echo "Summary: ${FAILURES} failure(s), ${WARNINGS} warning(s)"
[ "$FAILURES" -eq 0 ]
