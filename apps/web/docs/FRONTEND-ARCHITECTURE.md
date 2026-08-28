# Frontend Architecture

## Overview

Beauty Queen frontend is a Next.js 15 application using the App Router pattern.

## Directory Structure

```
apps/web/
├── app/
│   ├── layout.tsx              # Root layout (Header + Footer + Providers)
│   ├── page.tsx                # Homepage (client-rendered)
│   ├── loading.tsx             # Global loading state
│   ├── not-found.tsx           # 404 page
│   ├── global-error.tsx        # Global error boundary
│   ├── sitemap.ts              # Dynamic sitemap
│   ├── robots.ts               # Robots.txt
│   ├── search/page.tsx         # Search results with pagination
│   ├── product/[id]/page.tsx   # Product detail with structured data
│   ├── category-layout.tsx     # Shared category page layout
│   ├── saree/page.tsx          # Category: Saree
│   ├── kurthi/page.tsx         # Category: Kurthi
│   ├── top/page.tsx            # Category: Top
│   ├── leggin/page.tsx         # Category: Leggin
│   ├── cosmetics/page.tsx      # Category: Cosmetics
│   ├── cart/page.tsx           # Shopping cart
│   ├── checkout/page.tsx       # Checkout flow
│   ├── login/page.tsx          # Customer login (OTP)
│   ├── verify/page.tsx         # OTP verification
│   ├── account/                # User account pages
│   ├── orders/                 # Order history
│   ├── seller/                 # Seller portal
│   └── admin/                  # Admin dashboard
├── components/
│   ├── providers.tsx           # React Query provider
│   ├── layout/
│   │   ├── header.tsx          # Responsive header
│   │   ├── footer.tsx          # Footer
│   │   └── mobile-menu.tsx     # Slide-out mobile menu
│   ├── product/
│   │   ├── product-card.tsx    # Product card (next/image)
│   │   ├── product-grid.tsx    # Responsive grid
│   │   ├── product-gallery.tsx # Image gallery
│   │   ├── search-bar.tsx      # Debounced search
│   │   └── pagination.tsx      # Pagination controls
│   └── ui/                     # Base UI components
├── hooks/
│   ├── use-products.ts         # Product queries
│   ├── use-orders.ts           # Order queries
│   └── use-account.ts          # Account queries
├── services/
│   ├── product.service.ts      # Product API client
│   ├── category.service.ts     # Category API client
│   └── server-product.service.ts # Server-side product fetching
├── lib/
│   ├── api.ts                  # API client class
│   └── utils.ts                # Utilities (formatPrice, getProductImageUrl)
├── store/
│   └── index.ts                # Zustand stores (auth, UI, checkout)
└── types/
    └── index.ts                # TypeScript interfaces
```

## State Management

### Zustand Stores
- `useAuthStore` - User authentication state
- `useUIStore` - UI state (mobile menu, search)
- `useCheckoutStore` - Checkout flow state

### React Query
- Server state caching with TanStack Query
- Query invalidation after mutations
- Optimistic updates for cart/wishlist

## Data Flow

1. **Server Components** - Metadata, initial HTML
2. **Client Components** - Interactive UI, API calls
3. **React Query** - Server state caching
4. **Zustand** - Client state (auth, UI, checkout)
5. **API Client** - HTTP requests to NestJS backend

## Key Patterns

### URL-Based State
Search, filter, sort, and pagination are represented in URL query parameters:
```
/search?q=cosmetics&sort=price_asc&page=2
/saree?sort=newest&page=3
```

### Image Handling
- All images via `next/image` component
- Centralized `getProductImageUrl()` helper
- Error fallback to placeholder
- Responsive `sizes` attribute

### Debounced Search
- 300ms debounce on search input
- Minimum 2 characters to trigger
- Dropdown preview with 5 results
- Full search page with pagination

### Rate Limiting
- In-memory rate limiting on backend
- No external dependencies (no @nestjs/throttler)
- Applied to search (30/min), auth (10/min), checkout (5/min)
