# Performance Configuration

## Image Optimization

### Next.js Image Component
All product images use `next/image` with:
- `fill` layout for responsive sizing
- `sizes` attribute for responsive loading
- `unoptimized` flag for external images
- Error fallback to placeholder image

### Image Configuration (`next.config.js`)
```js
images: {
  formats: ['image/avif', 'image/webp'],
  minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  remotePatterns: [
    { protocol: 'http', hostname: 'localhost', port: '5000' },
    { protocol: 'https', hostname: 'placehold.co' },
  ],
}
```

## Caching Strategy

### HTTP Headers (`next.config.js`)
- Static assets: `Cache-Control: public, max-age=31536000, immutable`
- Product API: `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`
- Security headers: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection

### React Query (Client-Side)
- Default stale time: 60 seconds
- Homepage data: 5 minutes stale time
- Categories: 5 minutes stale time
- No refetch on window focus

### API-Level (Backend)
- Redis caching for frequently accessed product/category data
- In-memory rate limiting for search/auth endpoints

## Code Splitting

- All pages are Client Components (loaded on demand)
- Category layout shared across category pages
- Mobile menu loaded only when opened
- Loading states shown during dynamic imports

## Bundle Optimization

- Tree-shaking enabled via Next.js
- Only Lucide icons used (not full icon library)
- Tailwind CSS purging unused styles
- No unused dependencies in production

## Performance Targets

- Initial page load: < 3s on 3G
- Product page: < 2s on 4G
- Search API response: < 500ms
- Image loading: Progressive with blur placeholder
- No layout shift (CLS < 0.1)

## Rate Limiting (Backend)

- Search: 30 requests/minute per IP
- Auth endpoints: 10 requests/minute per IP
- Checkout: 5 requests/minute per IP
- Implemented via in-memory interceptors (no external dependency)
