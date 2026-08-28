# Security

## Authentication

- **OTP-based**: Email OTP for customer login (6-digit, 5-minute TTL, max 5 attempts)
- **JWT tokens**: Access token (15m) + Refresh token (7d) stored as httpOnly cookies
- **Refresh token rotation**: Old token revoked on each refresh, reuse detection revokes all tokens
- **Crypto.randomInt**: OTP generation uses cryptographically secure random numbers
- **No fallback secrets**: Application fails to start if JWT secrets are not configured

## Authorization

- **Roles**: CUSTOMER, SELLER, ADMIN
- **Guards**: JwtAuthGuard, RolesGuard, OwnershipGuard
- **RBAC**: Each endpoint has explicit role requirements
- **Ownership**: Sellers can only manage their own products/orders

## API Security

- **Rate limiting**: Auth endpoints (10/min), Search (30/min), Checkout (5/min)
- **Input validation**: All inputs validated via class-validator + Zod schemas
- **Whitelist mode**: ValidationPipe rejects unknown properties
- **CORS**: Configured for specific frontend origin only
- **Helmet**: Security headers including CSP (allows Razorpay domains)
- **Error handling**: Global exception filter, no stack traces in production responses

## Payment Security

- **Backend creates Razorpay orders**: Frontend amount never trusted
- **HMAC signature verification**: All payment signatures verified server-side
- **Webhook signature verification**: Razorpay webhooks validated with dedicated webhook secret
- **Idempotent**: Duplicate payment attempts handled gracefully
- **Amount verification**: Backend recalculates all amounts independently

## Data Protection

- **httpOnly cookies**: JWT tokens not accessible via JavaScript
- **Secure flag**: Cookies use Secure flag in production
- **SameSite**: Cookies use SameSite=Lax
- **Password hashing**: bcrypt with salt rounds=10
- **No secrets in code**: All secrets via environment variables
- **Env validation**: Application fails to start if required secrets missing

## File Upload Security

- **MIME type validation**: Only image files accepted
- **File size limits**: Configured via multer
- **Sharp processing**: Images resized and converted to WebP
- **No executable files**: Reject .exe, .js, .php, .sh

## Headers

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com; ...
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

## Logging

- **What's logged**: Request ID, user ID, endpoint, status, execution time, errors
- **What's NOT logged**: Passwords, OTPs, JWT tokens, refresh tokens, payment secrets, card info

## Secrets Management

- Never commit `.env` files
- `.env.example` contains only placeholders
- Production secrets rotated if ever committed
- Docker compose uses environment variables, not files

## CSRF

- Cookie-authenticated requests rely on `SameSite=Lax` + `HttpOnly` cookies.
- An optional double-submit CSRF token is available:
  - `GET /api/csrf` issues a JS-readable `csrf_token` cookie.
  - Clients mirror it into the `x-csrf-token` header.
  - `CsrfGuard` verifies the signed header/cookie pair on protected
    state-changing endpoints (`apps/api/src/common/csrf/*`).
- Adoption is per-route and opt-in so existing clients are never broken; a
  route must expect the `x-csrf-token` header before the guard is applied.

## Request / Correlation IDs & Logging

- Every request is assigned a `x-request-id` (honours an inbound one).
  (`apps/api/src/common/request-id.middleware.ts`)
- Structured access logs include request id, method, URL, status and duration
  via pino. (`apps/api/src/common/interceptors/logging.interceptor.ts`)
- Global exception filter includes the request id and never leaks internal
  exception details to production clients. (`apps/api/src/common/filters/*`)
- Sensitive values are never logged (passwords, OTPs, JWT/refresh tokens,
  Razorpay webhook secret, Brevo API key, card details).

## OTP Rate Limiting

- OTP send/verify are limited per email AND per IP (not IP-only), so genuine
  users behind shared networks are not blocked while a single account or host
  cannot be hammered. (`apps/api/src/auth/guards/otp-rate-limit.guard.ts`)
