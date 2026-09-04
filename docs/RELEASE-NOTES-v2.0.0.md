# Release Notes — v2.0.0

**Release Date:** 2026-09-04

---

## New

### E-Commerce Platform
- Complete Next.js 15 + NestJS 10 monorepo architecture
- Product catalog with 5 categories (Saree, Cosmetics, Kurti, Leggings, Tops)
- Full product management with images, variants, pricing
- Shopping cart with persistent state (Zustand + API)
- Multi-step checkout with address management
- Razorpay payment integration (UPI + COD)
- Order lifecycle management (Pending → Confirmed → Processing → Shipped → Delivered)
- Order tracking with status timeline
- Invoice generation
- Return and refund request system
- Coupon system with percentage/fixed discounts, usage limits, auto-expiry
- Product reviews and ratings
- Wishlist functionality
- Search with query logging
- Price alerts and stock alerts
- Abandoned cart email recovery
- Customer support ticket system

### Authentication & Authorization
- OTP-based email authentication (Brevo)
- JWT access + refresh token rotation
- Role-based access control (Customer, Seller, Admin)
- CSRF protection
- Session management with refresh token revocation

### Seller Portal
- Seller registration and login
- Product CRUD management
- Inventory tracking
- Order management
- Seller dashboard with analytics
- Profile management

### Admin Dashboard
- Full admin panel with analytics
- Product management (CRUD, categories, inventory)
- Order management with status updates
- User management
- Seller management
- Coupon management
- Refund processing
- Return request handling
- Audit logging
- Support ticket management
- Revenue analytics

### Infrastructure
- Docker multi-stage production builds
- Nginx reverse proxy with SSL termination
- Rate limiting (API: 30 req/s, Auth: 5 req/s)
- Security headers (CSP, HSTS, X-Frame-Options, etc.)
- Gzip compression
- MySQL 8.0 with utf8mb4 and tuned InnoDB settings
- Redis 7 with AOF persistence and LRU eviction
- BullMQ for async job processing (email, notifications)
- Scheduled jobs with Redis distributed locking
- GitHub Actions CI/CD pipeline
- Staging + production deployment workflow

### Developer Experience
- Shared TypeScript packages (types, config, validation)
- Prisma ORM with type-safe database access
- Comprehensive test suite (147 unit tests)
- ESLint with zero-warning policy
- Prettier formatting
- Playwright E2E test framework
- Hot reload development mode

---

## Improved

- Migrated from legacy Express + Handlebars to Next.js App Router + NestJS
- Replaced session-based auth with JWT token-based authentication
- Replaced monolithic deployment with containerized microservices
- Replaced manual deployments with automated CI/CD pipeline
- Replaced flat file storage with Prisma-managed MySQL database
- Replaced ad-hoc email with BullMQ queue-based email delivery
- Replaced client-side state with Zustand + server state via React Query

---

## Security

- Helmet.js HTTP security headers
- CORS origin restriction
- CSRF token protection
- Rate limiting on all endpoints
- Stricter rate limiting on authentication endpoints
- Input validation via class-validator + Zod
- SQL injection prevention via Prisma parameterized queries
- XSS prevention via React's built-in escaping
- Secure cookie settings (HttpOnly, Secure, SameSite)
- JWT secret rotation with minimum 32-character requirement
- Dev/test secret pattern detection in production mode
- Production environment validation (fatal on missing credentials)
- Idempotent payment webhooks with signature verification
- Audit logging for administrative actions
- RBAC enforcement on all protected routes
- IDOR protection via ownership guards
- Request size limits via Nginx

---

## Infrastructure

- Multi-stage Docker builds with non-root users and tini init
- Nginx reverse proxy with upstream health checks
- MySQL tuned: 256MB InnoDB buffer pool, slow query logging, binlog rotation
- Redis tuned: 256MB max memory, LRU eviction, AOF persistence
- Docker Compose production configuration with resource limits
- Named volumes for persistent data
- Internal-only backend network
- Automated backup with retention policy
- Documented restore and rollback procedures
- GitHub Actions with GHCR image caching
- Staging environment with smoke tests before production
- Pre-deployment database backup automation

---

## Known Issues

1. **No production server provisioned in this environment** — Requires manual server setup before deployment
2. **No `.env.production` file** — Must be created on production server with real secrets
3. **No DNS/SSL configured** — Domain and SSL certificate must be provisioned separately
4. **CI/CD secrets not configured** — GitHub Actions secrets (SSH keys, production host) must be set
5. **Image processing on upload is synchronous** — Background image processing queue is documented as a reserved stub
6. **Playwright E2E tests not yet run in CI** — Framework configured but not integrated into pipeline yet
