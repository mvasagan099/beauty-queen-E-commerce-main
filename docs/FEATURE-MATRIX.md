# Feature Matrix

**Date:** 2026-08-26
**Scope:** Complete feature comparison — Legacy vs New

---

## Customer Features

| Feature | Legacy | New | Status | Priority |
|---------|-------:|----:|--------|----------|
| Homepage with categories | Yes | Yes | Complete | — |
| Product listing (5 categories) | Yes | Yes | Complete | — |
| Product detail page | Yes | Yes | Complete | — |
| Product search | Yes | Yes | Complete | — |
| OTP email login | Yes | Yes | Complete | — |
| Cart (add/remove/update) | Yes | Yes | Improved | — |
| Buy Now (single item) | Yes | Yes | Complete | — |
| Cart Buy Now (all items) | Yes | Yes | Complete | — |
| Checkout (address + payment) | Yes | Yes | Improved | — |
| Razorpay UPI payment | Yes | Yes | Improved | — |
| COD payment | Yes | Yes | Complete | — |
| Payment verification | No | Yes | New | — |
| Payment retry | No | Yes | New | — |
| Order confirmation | Yes | Yes | Complete | — |
| Order history | Yes | Yes | Complete | — |
| Order detail | No | Yes | New | — |
| Order cancellation | No | Yes | New | — |
| Order status tracking | No | Yes | New | — |
| Account dashboard | No | Yes | New | — |
| Profile management | No | Yes | New | — |
| Saved addresses | No | Yes | New | — |
| Wishlist | No | Yes | New | P2 |
| Product reviews | No | Yes | New | P2 |
| Review moderation | No | Yes | New | P2 |
| Contact page | Yes | Yes | Complete | — |
| 404 page | Yes | Yes | Complete | — |
| Coupon system | No | Yes (backend) | Partially Implemented | P2 |
| Coupon UI (checkout) | No | No | Missing | P2 |
| Product recommendations | No | No | Not Required | — |

## Seller Features

| Feature | Legacy | New | Status | Priority |
|---------|-------:|----:|--------|----------|
| Seller login | Yes | Yes | Complete | — |
| Seller signup | Yes | Yes | Complete | — |
| Seller dashboard | Yes | Yes | Improved | — |
| Product list (own) | Yes | Yes | Complete | — |
| Add product | Yes | Yes | Complete | — |
| Edit product | Yes | Yes | Complete | — |
| Delete product (soft) | No (hard) | Yes | Improved | — |
| Restore product | No | Yes | New | — |
| Image upload (5 images) | Yes | Yes | Complete | — |
| Inventory management | No | Yes | New | — |
| Order list (own) | No | Yes | New | — |
| Order detail (own) | No | Yes | New | — |
| Update order status | No | Yes | New | — |
| Profile update | No | Yes | New | — |
| Ownership enforcement | No | Yes | New | — |

## Admin Features

| Feature | Legacy | New | Status | Priority |
|---------|-------:|----:|--------|----------|
| Admin dashboard | No (basic) | Yes | Improved | — |
| View all products | Yes | Yes | Complete | — |
| View all orders | Yes | Yes | Complete | — |
| Order detail | No | Yes | New | — |
| Update order status | Yes | Yes | Complete | — |
| Delete order | Yes | Yes | Complete | — |
| Delete product (soft) | Yes (hard) | Yes | Improved | — |
| User management | No | Yes | New | — |
| User role change | No | Yes | New | — |
| Seller management | No | Yes | New | — |
| Seller status toggle | No | Yes | New | — |
| Seller role change | No | Yes | New | — |
| Review moderation | No | Yes | New | — |
| Auth protection | No | Yes | Improved | — |
| Audit logging | No | Yes | New | — |

## Infrastructure Features

| Feature | Legacy | New | Status | Priority |
|---------|-------:|----:|--------|----------|
| MySQL database | Yes | Yes | Improved | — |
| ORM (raw → Prisma) | No | Yes | New | — |
| JWT authentication | No | Yes | New | — |
| Refresh token rotation | No | Yes | New | — |
| Redis caching | No | Yes | New | — |
| BullMQ job queues | No | Yes | New | — |
| Email queue (OTP, orders) | No | Yes | New | — |
| Image processing queue | No | Yes (stub) | Partially Implemented | — |
| Notification queue | No | Yes (stub) | Partially Implemented | — |
| Swagger API docs | No | Yes | New | — |
| Health check | Yes | Yes | Complete | — |
| Structured logging (Pino) | No | Yes | New | — |
| Helmet security headers | No | Yes | New | — |
| Global validation pipe | No | Yes | New | — |
| Global exception filter | No | Yes | New | — |
| Soft delete (products) | No | Yes | New | — |
| Order status history | No | Yes | New | — |
| Docker (MySQL + Redis) | No | Yes | New | — |
| Monorepo structure | No | Yes | New | — |
| TypeScript (full stack) | No | Yes | New | — |

## SEO Features

| Feature | Legacy | New | Status | Priority |
|---------|-------:|----:|--------|----------|
| Page metadata | No | Yes | New | — |
| Open Graph tags | No | Yes | New | — |
| Sitemap.xml | No | Yes | New | — |
| Robots.txt | No | Yes | New | — |
| Canonical URLs | No | No | Missing | P2 |
| JSON-LD structured data | No | No | Missing | P2 |
| SSR/SSG | No (CSR) | Yes | New | — |

## Security Features

| Feature | Legacy | New | Status | Priority |
|---------|-------:|----:|--------|----------|
| Password hashing | No | Yes | New | — |
| Role-based access | No | Yes | New | — |
| Ownership guards | No | Yes | New | — |
| JWT auth | No | Yes | New | — |
| httpOnly cookies | No | Yes | New | — |
| Rate limiting | No | No | Missing | P0 |
| CSRF protection | No | No | Missing | P1 |
| CSP headers | No | No | Missing | P1 |
| Webhook verification | No | Partially | Broken | P0 |

---

## Summary

| Category | Total Features | Complete | Improved | New | Partially Implemented | Missing | Broken |
|----------|---------------|----------|----------|-----|----------------------|---------|--------|
| Customer | 27 | 12 | 3 | 8 | 1 | 2 | 0 |
| Seller | 15 | 6 | 1 | 7 | 0 | 0 | 0 |
| Admin | 15 | 5 | 2 | 7 | 0 | 0 | 0 |
| Infrastructure | 22 | 2 | 2 | 16 | 2 | 0 | 0 |
| SEO | 7 | 0 | 0 | 5 | 0 | 2 | 0 |
| Security | 9 | 3 | 0 | 5 | 1 | 2 | 1 |
| **TOTAL** | **95** | **28** | **8** | **48** | **4** | **6** | **1** |
