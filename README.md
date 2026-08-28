# Beauty Queen E-commerce

Full-stack e-commerce application built with Next.js 15 + NestJS + Prisma + MySQL.

## Architecture

```
                    ┌───────────────┐
                    │    Next.js    │
                    │   Frontend    │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │    NestJS     │
                    │   REST API    │
                    └───────┬───────┘
                            │
          ┌─────────────────┼─────────────────┐
          ▼                 ▼                 ▼
       Prisma             Redis            Razorpay
          │                 │
          ▼                 ▼
        MySQL            BullMQ
                            │
                            ▼
                         Workers
                            │
                            ▼
                          Brevo
```

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Zustand, React Query
- **Backend**: NestJS, Prisma ORM, MySQL, Redis, BullMQ, JWT + Refresh Tokens
- **Payments**: Razorpay (UPI + COD)
- **Email**: Brevo SMTP API
- **Deployment**: Docker, Docker Compose, GitHub Actions CI/CD

## Prerequisites

- Node.js 20+
- MySQL 8.0+
- Redis 7+
- npm

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd beauty-queen

# Install all dependencies
npm run install:all

# Install root dependencies
npm install
```

### 2. Configure Environment

```bash
# Copy the example env file
cp .env.example .env

# Edit .env with your values
# At minimum, set:
#   DATABASE_URL - MySQL connection string
#   JWT_ACCESS_SECRET - Random string (min 32 chars)
#   JWT_REFRESH_SECRET - Random string (min 32 chars)
#   REDIS_HOST - Redis host (default: localhost)
```

Generate secure JWT secrets:
```bash
# Linux/Mac
openssl rand -base64 48

# Windows PowerShell
[System.Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

### 3. Start MySQL and Redis

**Option A: Docker Compose (recommended)**
```bash
docker-compose up -d mysql redis
```

**Option B: Local MySQL and Redis**
Ensure MySQL and Redis are running on localhost:3306 and localhost:6379.

### 4. Run Database Migrations

```bash
# Generate Prisma client
npm run db:generate

# Run migrations (creates all tables)
cd apps/api && npx prisma migrate dev
```

### 5. Seed Database (optional)

```bash
npm run db:seed
```

### 6. Start Development Servers

```bash
# Start both API and Web concurrently
npm run dev
```

This starts:
- **API**: http://localhost:5000/api
- **Web**: http://localhost:3000
- **Swagger docs**: http://localhost:5000/api/docs

### Individual Services

```bash
# API only
npm run dev:api

# Web only
npm run dev:web
```

## Project Structure

```
beauty-queen/
├── apps/
│   ├── web/                    # Next.js 15 Frontend
│   │   ├── app/                # Pages and routes (App Router)
│   │   ├── components/         # React components
│   │   ├── hooks/              # React Query hooks
│   │   ├── services/           # API service layer
│   │   ├── lib/                # Utilities and API client
│   │   ├── store/              # Zustand state stores
│   │   └── types/              # TypeScript types
│   │
│   └── api/                    # NestJS Backend
│       └── src/
│           ├── auth/           # OTP, JWT, guards
│           ├── users/          # User profile, addresses
│           ├── products/       # Product CRUD, images
│           ├── categories/     # Category management
│           ├── cart/           # Shopping cart
│           ├── checkout/       # Checkout flow
│           ├── payments/       # Razorpay integration
│           ├── orders/         # Order management
│           ├── inventory/      # Stock management
│           ├── sellers/        # Seller management
│           ├── admin/          # Admin dashboard
│           ├── coupons/        # Discount coupons
│           ├── returns/        # Return requests
│           ├── refunds/        # Refund processing
│           ├── notifications/  # Email + in-app notifications
│           ├── reviews/        # Product reviews
│           ├── wishlist/       # User wishlist
│           ├── pricing/        # Price calculation
│           ├── shipping/       # Shipping rules
│           ├── tax/            # Tax/GST rules
│           ├── audit/          # Audit logging
│           ├── common/         # Shared: Redis, BullMQ, health, filters
│           ├── config/         # Environment validation
│           └── prisma/         # Prisma service
│
├── packages/
│   ├── types/                  # Shared TypeScript types
│   ├── config/                 # Shared configuration
│   └── validation/             # Shared Zod schemas
│
├── prisma/
│   ├── schema.prisma           # Database schema (20+ models)
│   ├── migrations/             # Migration files (20260828000000_init baseline)
│   └── seed.js                 # Database seed script
│
├── scripts/
│   ├── migrate-legacy-data.ts  # Legacy data migration
│   └── verify-migration.ts     # Migration verification
│
├── docker/
│   ├── api/Dockerfile          # API production image
│   ├── web/Dockerfile          # Web production image
│   └── worker/Dockerfile       # Worker production image
│
├── docs/                       # Documentation
├── .github/workflows/          # CI (build.yml, lint.yml, test.yml)
├── docker-compose.yml          # Local development services
└── .env.example                # Environment variables template
```

## Docker

### Development

```bash
# Start MySQL and Redis
docker-compose up -d mysql redis

# Start API and Web
npm run dev
```

### Production

```bash
# Build and start all services
docker-compose up -d --build

# Or build individual services
docker-compose up -d api
docker-compose up -d web
docker-compose up -d worker
```

Services:
- **api**: http://localhost:5000
- **web**: http://localhost:3000
- **mysql**: localhost:3306
- **redis**: localhost:6379

### Health Checks

```bash
# API health
curl http://localhost:5000/api/health

# Liveness probe
curl http://localhost:5000/api/health/live

# Readiness probe
curl http://localhost:5000/api/health/ready
```

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
cd apps/api && npm run test:cov
```

## Database

### Migrations

```bash
# Create a new migration
cd apps/api && npx prisma migrate dev --name <migration-name>

# Apply migrations in production
cd apps/api && npx prisma migrate deploy

# Reset database (WARNING: deletes all data)
cd apps/api && npx prisma migrate reset

# View database in browser
npm run db:studio
```

### Legacy Data Migration

```bash
# Set LEGACY_DATABASE_URL in .env
# Then run:
npx ts-node scripts/migrate-legacy-data.ts

# Verify migration:
npx ts-node scripts/verify-migration.ts
```

## API Endpoints

### Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/auth/send-otp | Send OTP to email | No |
| POST | /api/auth/verify-otp | Verify OTP and login | No |
| POST | /api/auth/refresh | Refresh access token | No |
| POST | /api/auth/logout | Logout | Yes |
| GET | /api/auth/me | Get current user | Yes |

### Products
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/products | List products | No |
| GET | /api/products/homepage | Homepage data | No |
| GET | /api/products/search | Search products | No |
| GET | /api/products/:id | Get product | No |
| POST | /api/products | Create product | Seller/Admin |
| PATCH | /api/products/:id | Update product | Seller/Admin |
| DELETE | /api/products/:id | Delete product | Seller/Admin |

### Cart
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/cart | Get cart | Yes |
| POST | /api/cart | Add to cart | Yes |
| PUT | /api/cart/:itemId | Update quantity | Yes |
| DELETE | /api/cart/:itemId | Remove item | Yes |
| DELETE | /api/cart | Clear cart | Yes |

### Payments
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/payments/checkout | Create checkout | Yes |
| POST | /api/payments/verify | Verify payment | Yes |
| POST | /api/payments/cod/confirm | Confirm COD | Yes |
| POST | /api/payments/webhook | Razorpay webhook | No |

### Orders
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/orders | My orders | Yes |
| GET | /api/orders/:id | Order detail | Yes |
| GET | /api/orders/all | All orders | Admin |
| PUT | /api/orders/:id/status | Update status | Admin |

### Admin
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/admin/dashboard | Dashboard stats | Admin |
| GET | /api/admin/products | All products | Admin |
| GET | /api/admin/orders | All orders | Admin |
| GET | /api/admin/users | All users | Admin |
| GET | /api/admin/sellers | All sellers | Admin |

### Health
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/health | Full health check | No |
| GET | /api/health/live | Liveness probe | No |
| GET | /api/health/ready | Readiness probe | No |

## Pages

| Route | Description |
|-------|-------------|
| `/` | Homepage |
| `/login` | Customer OTP login |
| `/verify` | OTP verification |
| `/saree` | Saree collection |
| `/kurthi` | Kurthi collection |
| `/top` | Top collection |
| `/leggin` | Leggin collection |
| `/cosmetics` | Cosmetics collection |
| `/product/[id]` | Product detail |
| `/search` | Search results |
| `/cart` | Shopping cart |
| `/checkout` | Checkout |
| `/confirmation` | Order confirmation |
| `/payment/success` | Payment success |
| `/payment/failure` | Payment failure |
| `/account` | Account dashboard |
| `/account/profile` | Profile settings |
| `/account/orders` | Order history |
| `/account/addresses` | Address management |
| `/wishlist` | Wishlist |
| `/seller/login` | Seller login |
| `/seller/signup` | Seller signup |
| `/seller` | Seller dashboard |
| `/seller/products` | Seller products |
| `/seller/add-product` | Add product |
| `/seller/orders` | Seller orders |
| `/admin` | Admin dashboard |
| `/admin/products` | Admin products |
| `/admin/orders` | Admin orders |
| `/admin/users` | Admin users |
| `/admin/sellers` | Admin sellers |
| `/admin/coupons` | Coupon management |
| `/admin/returns` | Return requests |
| `/admin/refunds` | Refund requests |

## Environment Variables

See `.env.example` for all required and optional variables.

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | MySQL connection URL |
| `JWT_ACCESS_SECRET` | Yes | JWT access token secret (min 32 chars) |
| `JWT_REFRESH_SECRET` | Yes | JWT refresh token secret (min 32 chars) |
| `REDIS_HOST` | No | Redis host (default: localhost) |
| `REDIS_PORT` | No | Redis port (default: 6379) |
| `PORT` | No | API port (default: 5000) |
| `NODE_ENV` | No | development/production/test |
| `FRONTEND_URL` | No | Frontend URL for CORS |
| `RAZORPAY_KEY_ID` | Production | Razorpay key |
| `RAZORPAY_KEY_SECRET` | Production | Razorpay secret |
| `RAZORPAY_WEBHOOK_SECRET` | Production | Razorpay webhook secret |
| `BREVO_API_KEY` | Production | Brevo email API key |
| `NEXT_PUBLIC_API_URL` | Yes | API URL for frontend |

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)
- [Database Schema](docs/DATABASE.md)
- [Authentication](docs/AUTHENTICATION.md)
- [Authorization Matrix](docs/AUTHORIZATION-MATRIX.md)
- [Payment Flow](docs/PAYMENT.md)
- [Security](docs/SECURITY.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Backup & Restore](docs/BACKUP-RESTORE.md)
- [Data Migration](docs/DATA-MIGRATION.md)
- [Missing Features](docs/MISSING-FEATURES.md)
- [Feature Inventory](docs/FEATURE-INVENTORY.md)
- [Current State Audit](docs/CURRENT-STATE-AUDIT.md)
- [Final Bug Report](docs/FINAL-BUG-REPORT.md)
- [Final Feature Matrix](docs/FINAL-FEATURE-MATRIX.md)
- [API Endpoint Matrix](docs/API-ENDPOINT-MATRIX.md)
- [RC1 Release Notes](docs/RELEASE-CANDIDATE-RC1.md)
- [RC1 Bug & Risk Register](docs/RC1-BUGS.md)
- [Final Project Report](docs/FINAL-PROJECT-REPORT.md)
- [Project Completion Report](docs/PROJECT-COMPLETION-REPORT.md)
- [Changelog](CHANGELOG.md)

## License

Private - Beauty Queen E-commerce
