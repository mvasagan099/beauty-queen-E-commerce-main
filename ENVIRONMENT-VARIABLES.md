# ENVIRONMENT-VARIABLES.md — Beauty Queen E-commerce

## Legacy Environment Variables (server/.env)

| Variable | Purpose | Used In | Frontend/Backend | Secret? | Required? | Notes |
|----------|---------|---------|-----------------|---------|-----------|-------|
| `EMAIL_USER` | Gmail address for email sending | server/.env | Backend | Yes | No | NOT actually used in code (Brevo used instead) |
| `EMAIL_PASS` | Gmail app password | server/.env | Backend | Yes | No | NOT actually used in code (Brevo used instead) |
| `DB_HOST` | MySQL database host | server/router.js:155 | Backend | Yes | Yes | Clever Cloud host |
| `DB_USER` | MySQL database username | server/router.js:156 | Backend | Yes | Yes | Clever Cloud user |
| `DB_PASS` | MySQL database password | server/router.js:157 | Backend | Yes | Yes | Clever Cloud password |
| `DB_NAME` | MySQL database name | server/router.js:158 | Backend | Yes | Yes | Clever Cloud database |
| `BREVO_API_KEY` | Brevo transactional email API key | server/router.js:25 | Backend | Yes | Yes | Set via Zoho Catalyst console |
| `R_id` | Razorpay Key ID | server/router.js:265 | Backend | Yes | Yes | Set via Zoho Catalyst console |
| `R_key` | Razorpay Key Secret | server/router.js:266 | Backend | Yes | Yes | Set via Zoho Catalyst console |
| `PORT` | Server listen port | app.js:44 | Backend | No | No | Default: 3000 |
| `X_ZOHO_CATALYST_LISTEN_PORT` | Catalyst deployment port | app.js:44 | Backend | No | No | Catalyst-specific |

### Alternate Variable Names (also checked)

| Variable | Fallback For | Used In |
|----------|-------------|---------|
| `MYSQL_HOST` | `DB_HOST` | server/router.js:155 |
| `MYSQL_USER` | `DB_USER` | server/router.js:156 |
| `MYSQL_PASSWORD` | `DB_PASS` | server/router.js:157 |
| `MYSQL_DATABASE` | `DB_NAME` | server/router.js:158 |

---

## New Backend Environment Variables (backend/.env)

| Variable | Purpose | Used In | Frontend/Backend | Secret? | Required? | Notes |
|----------|---------|---------|-----------------|---------|-----------|-------|
| `DB_HOST` | MySQL database host | backend/src/config/env.ts | Backend | Yes | Yes | Same as legacy |
| `DB_USER` | MySQL database username | backend/src/config/env.ts | Backend | Yes | Yes | Same as legacy |
| `DB_PASS` | MySQL database password | backend/src/config/env.ts | Backend | Yes | Yes | Same as legacy |
| `DB_NAME` | MySQL database name | backend/src/config/env.ts | Backend | Yes | Yes | Same as legacy |
| `DB_PORT` | MySQL database port | backend/src/config/env.ts | Backend | No | Yes | Default: 3306 |
| `RAZORPAY_KEY_ID` | Razorpay Key ID | backend/src/config/env.ts | Backend | Yes | Yes | Renamed from R_id |
| `RAZORPAY_KEY_SECRET` | Razorpay Key Secret | backend/src/config/env.ts | Backend | Yes | Yes | Renamed from R_key |
| `BREVO_API_KEY` | Brevo API key | backend/src/config/env.ts | Backend | Yes | Yes | Same as legacy |
| `JWT_SECRET` | JWT signing secret | backend/src/config/env.ts | Backend | Yes | Yes | NEW — not in legacy |
| `PORT` | Server listen port | backend/src/config/env.ts | Backend | No | No | Default: 4000 |
| `NODE_ENV` | Environment mode | backend/src/config/env.ts | Backend | No | No | Affects cookie secure flag |
| `FRONTEND_URL` | Frontend URL for CORS | backend/src/config/env.ts | Backend | No | Yes | NEW — for CORS |

---

## New Frontend Environment Variables (frontend/.env.local)

| Variable | Purpose | Used In | Frontend/Backend | Secret? | Required? | Notes |
|----------|---------|---------|-----------------|---------|-----------|-------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | frontend/lib/api.ts | Frontend | No | Yes | Default: http://localhost:4000 |

---

## Environment Variables NOT in .env (Set via Zoho Catalyst Console)

These variables are used in code but not present in the .env file. They were set as environment variables in the Zoho Catalyst deployment console.

| Variable | Purpose | Critical? |
|----------|---------|-----------|
| `BREVO_API_KEY` | Brevo email API | Yes |
| `R_id` | Razorpay Key ID | Yes |
| `R_key` | Razorpay Key Secret | Yes |

---

## Security Notes

1. **Never commit .env files** — all .env files are in .gitignore
2. **Secrets to protect:** DB credentials, Brevo API key, Razorpay keys, JWT secret
3. **Non-secrets:** PORT, NODE_ENV, FRONTEND_URL, NEXT_PUBLIC_API_URL
4. **Legacy EMAIL_USER/EMAIL_PASS** are in .env but not used in code (Brevo replaced Nodemailer)
5. **Razorpay keys** are set via Catalyst console, not in .env — this means local development has no Razorpay keys
