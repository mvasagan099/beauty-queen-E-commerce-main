# SEO Configuration

## Overview

Beauty Queen uses Next.js built-in SEO features for search engine optimization.

## Files

- `app/sitemap.ts` - Dynamic sitemap generation
- `app/robots.ts` - Robots.txt configuration
- `app/layout.tsx` - Root metadata (title template, OG, Twitter)
- Category pages (`saree/page.tsx`, etc.) - Category-specific metadata
- Product pages - Dynamic `generateMetadata` from product data + JSON-LD structured data

## Metadata Structure

### Root Layout (`app/layout.tsx`)
- `metadataBase` set for relative URL resolution
- Title template: `%s | Beauty Queen`
- Default description and keywords
- OpenGraph and Twitter card configuration

### Category Pages
Each category page exports static `Metadata`:
```ts
export const metadata: Metadata = {
  title: "Saree Collection",
  description: "...",
  openGraph: { title: "...", description: "..." },
};
```

### Product Pages
Product pages include:
- `<title>` from product name
- `<meta name="description">` from product description
- OpenGraph tags for social sharing
- JSON-LD structured data for rich snippets

## Structured Data

Product pages include JSON-LD:
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "...",
  "description": "...",
  "image": "...",
  "offers": {
    "@type": "Offer",
    "price": "...",
    "priceCurrency": "INR",
    "availability": "https://schema.org/InStock"
  }
}
```

## Canonical URLs

Handled via `metadataBase` in the root layout. All pages automatically get canonical URLs.

## Sitemap

Dynamic sitemap at `/sitemap.xml` includes:
- Homepage (priority 1.0)
- Category pages (priority 0.9)
- Contact page (priority 0.3)

Product pages are excluded from static sitemap but can be added via dynamic generation.

## Robots.txt

At `/robots.txt`:
- Allows all public pages
- Disallows: `/account`, `/orders`, `/cart`, `/checkout`, `/seller/`, `/admin/`, `/login`, `/verify`, `/api/`

## Environment Variables

- `NEXT_PUBLIC_SITE_URL` - Base URL for sitemap and robots (default: `http://localhost:3000`)
