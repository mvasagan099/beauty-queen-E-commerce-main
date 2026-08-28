# Beauty Queen – UI Architecture

This document describes the frontend UI architecture for the canonical web application in
`apps/web` (Next.js 15, App Router), which targets the NestJS API in `apps/api` on port `5000`.

It is the companion to `docs/ARCHITECTURE.md` (system architecture) and focuses on the
presentation layer: design tokens, component structure, layouts, responsive behaviour,
accessibility, navigation, and loading/error conventions.

---

## 1. Tech stack (UI layer)

| Concern             | Choice                                                        |
| ------------------- | ------------------------------------------------------------- |
| Framework           | Next.js 15 (App Router, React 18+ client components)          |
| Styling             | Tailwind CSS v3 + `tailwindcss-animate`, CSS variables        |
| Primitives          | shadcn/ui-style local components under `components/ui`        |
| Icons               | `lucide-react`                                                |
| Server state        | TanStack Query (`@tanstack/react-query`) via `components/providers.tsx` |
| Client state        | Zustand (`store/index.ts`)                                    |
| Forms + validation  | `react-hook-form` + `@hookform/resolvers/zod` + `zod`         |
| Toasts              | `sonner` (`<Toaster position="top-center" richColors />`)     |
| Router              | Next Link / `usePathname` / `useRouter`                       |

---

## 2. Design system

### 2.1 Colour tokens (`app/globals.css`)

Tokens are CSS variables consumed by `tailwind.config.ts` (shadcn/ui pattern). The brand
accent is **pink** (`primary`).

| Token               | Value            | Usage                          |
| ------------------- | ---------------- | ------------------------------ |
| `--background`      | `0 0% 100%`      | page background (white)        |
| `--foreground`      | `0 0% 3.9%`      | default text (near-black)      |
| `--primary`         | `330 80% 64%`    | **brand pink** — CTAs, accents |
| `--primary-foreground` | `0 0% 98%`    | text on pink buttons           |
| `--secondary`       | `0 0% 96.1%`     | subtle surfaces                |
| `--muted-foreground`| `0 0% 45.1%`     | secondary text                 |
| `--destructive`     | `0 84.2% 60.2%`  | destructive actions            |
| `--border` / `--input` | `0 0% 89.8%`  | borders, inputs                |
| `--ring`            | `330 80% 64%`    | focus rings (pink)             |
| `--radius`          | `0.5rem`         | rounded corners                |

Status colours used throughout for badges (orders, payments, stock) are applied directly as
Tailwind utilities (e.g. `bg-yellow-100 text-yellow-700`, `bg-green-100 text-green-700`,
`bg-red-100 text-red-700`, `bg-blue-100 text-blue-700`, `bg-purple-100 text-purple-700`,
`bg-orange-100 text-orange-700`, `bg-cyan-100 text-cyan-700`).

### 2.2 Typography

- The `body` sets `font-family: 'Poppins', sans-serif` via `app/globals.css`.
- `app/layout.tsx` loads the `Inter` font from `next/font/google` and applies
  `inter.className` to `<body>`.

> **Known inconsistency:** the global font-family is **Poppins**, while the `next/font`
> loader on `<body>` applies **Inter**. The two declarations conflict; verify which font is
> actually rendering and align them (either use Poppins via the loader or remove the
> `Poppins` fallback in `globals.css`).

### 2.3 Core primitives (`components/ui`)

| File                 | Purpose                                              |
| -------------------- | ---------------------------------------------------- |
| `button.tsx`         | Button variants (`default`, `outline`, `ghost`, ...) |
| `card.tsx`           | Card container (`Card`, `CardHeader`, ...)           |
| `input.tsx`          | Text input                                           |
| `label.tsx`          | Accessible label                                     |
| `data-table.tsx`     | Reusable data table (admin/seller lists)             |
| `confirm-dialog.tsx` | Accessible confirm dialog (Radix Dialog) for destructive actions |

> **Destructive-action rule:** cancel order, deactivate seller, reject return, delete
> product, etc. must never be one-click or use `window.confirm()`. They go through
> `ConfirmDialog` (built on `@radix-ui/react-dialog`), which provides focus trap, overlay,
> `aria` labelling, and an explicit confirm/cancel split.

### 2.4 Domain components (`components/`)

- `cart/` — cart drawer/summary
- `checkout/` — address form, payment form, order summary
- `dashboard/` — `StatCard`, `StatusBadge`, chart helpers (admin/seller dashboards)
- `layout/` — `header.tsx`, `mobile-menu.tsx`, `footer.tsx`
- `notifications/` — `notification-bell.tsx`
- `orders/` — `order-timeline.tsx`, order cards
- `payment/` — `PaymentStatus.tsx` and related
- `product/` — `product-card.tsx`, product detail subcomponents
- `review/` — `rating-summary.tsx`, `review-card.tsx`, `product-reviews.tsx`, `review-form.tsx`

---

## 3. State & data access

### 3.1 Server state — TanStack Query

- `components/providers.tsx` wraps the app in a `QueryClientProvider` with
  `staleTime: 60s` and `refetchOnWindowFocus: false`.
- Feature hooks live in `hooks/` (e.g. `use-account.ts`, `use-orders.ts`) and expose
  queries/mutations that call the typed API client in `lib/api.ts`.
- All network access goes through `lib/api.ts` (`ApiClient` + namespaced objects such as
  `productsApi`, `ordersApi`, `authApi`, `sellerApi`, `adminApi`, `wishlistApi`,
  `paymentsApi`, `reviewsApi`, `returnsApi`, `refundsApi`, `notificationsApi`). The client
  resolves the base URL from `NEXT_PUBLIC_API_URL` (default `http://localhost:5000/api`) and
  attaches auth credentials; endpoints should not hardcode hosts (see §8).

### 3.2 Client state — Zustand (`store/index.ts`)

- `useAuthStore` — current user (`setUser`, `logout`).
- `useUIStore` — cart drawer / mobile menu visibility, search query.
- `useCheckoutStore` — checkout mode (`cart` | `buynow`) and the direct "Buy Now" item.

---

## 4. Layout architecture

### 4.1 Root layout (`app/layout.tsx`)

```
<html lang="en">
  <body>
    <Providers>            // TanStack Query
      <Header />           // sticky brand header + nav + search
      <main>{children}</main>
      <Footer />
      <Toaster />          // sonner notifications
    </Providers>
  </body>
</html>
```

- Global `metadata`, Open Graph, Twitter, `robots`, and JSON-LD-style page templates defined
  here; each page can override the `title` via `%s | Beauty Queen`.
- `app/robots.ts` and `app/sitemap.ts` provide `robots.txt` and `sitemap.xml`.

### 4.2 Admin layout (`app/admin/layout.tsx`)

- Scoped layout that enforces admin authentication/role and renders the admin sidebar +
  top navigation. All `/admin/**` pages inherit the guard.

### 4.3 Seller layout (`app/seller/layout.tsx`)

- Scoped layout for `/seller/**` with its own nav shell and `loading.tsx`.

### 4.4 Header & mobile menu

- `Header` (sticky) shows: brand, category nav, search, auth actions, wishlist, cart, and a
  role-aware branch — customer (`Account`, `Wishlist`, `NotificationBell`) vs seller
  (dashboard link + **Seller logout**). Seller login state is re-derived on route change and
  via the `storage` event so the header reflects login/logout without a manual refresh.
- A mobile-only search row (`md:hidden`) is included for small screens.
- `MobileMenu` renders slide-in navigation on small screens with Escape-key close and
  role-aware links (customer wishlist, seller logout).

### 4.5 Footer

- Quick Links, My Account (Login, My Account, Become a Seller), customer-service/contact
  links, and a brand/about section; responsive `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`.

---

## 5. Responsive strategy

- Mobile-first Tailwind utilities throughout; common breakpoint classes:
  - `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` (footer, stat grids)
  - `grid-cols-2 lg:grid-cols-5` (seller dashboard metrics)
  - `md:hidden` for mobile-only controls; `md:flex` for desktop controls
- All tables inside cards are wrapped in `overflow-x-auto` so wide data views scroll
  horizontally on small screens.
- Container pattern: `container mx-auto px-4 py-8` (with optional `max-w-` on forms).
- Images use `object-cover` with fixed container heights to avoid layout shift.

---

## 6. Accessibility

- Semantic elements: `<nav>`, `<main>`, `<button>` for interactive controls (no
  `div`-`onClick` handlers for actions).
- Every form control is paired with a `<Label htmlFor>` / matching `id`; composed selects and
  inputs use `aria-invalid` + `aria-describedby` where appropriate.
- Non-text actions carry `aria-label` (e.g. cart remove, wishlist toggle, "remove image",
  "mark as read"); toggle buttons use `aria-pressed`.
- Modals/dialogs use `@radix-ui/react-dialog` (`ConfirmDialog`) for focus management,
  overlay dismissal, and labelled descriptions; mobile menu supports Escape-to-close.
- Loading states provide accessible spinners (decorative `<div>` with no text) alongside
  meaningful empty/error copy; interactive confirmations rely on labelled dialogs, not
  `window.confirm()`.

### Accessibility & UX checklist

- [ ] Escape closes mobile menu, notification bell, confirm dialogs
- [ ] All destructive actions require `ConfirmDialog`
- [ ] Form inputs have visible, labelled errors
- [ ] Icon-only buttons have `aria-label` / `aria-pressed`
- [ ] Focus-visible styles use the pink `--ring` token

---

## 7. Loading, empty, and error states

Convention across list/detail views:

- **Loading:** centered spinner (`animate-spin rounded-full border-4 border-pink-500
  border-t-transparent`) inside a `min-h-[60vh]` or `py-12` container.
- **Empty:** clear centred copy (e.g. "No orders found.", "Your wishlist is empty.") —
  never a raw crash.
- **Error:** graceful message (e.g. "Unable to load orders.") instead of leaking raw error
  objects to the user. Mutations surface failures via `sonner` toasts.

---

## 8. Configuration & build notes

- `next.config.js`: API rewrites (`/api/:path*` → `API_PROXY_TARGET`, default
  `http://localhost:5000`), image remote patterns for `localhost:5000` and `placehold.co`,
  security headers, legacy redirects.
  - `output: "standalone"` is **opt-in** via `OUTPUT_STANDALONE=true`. The Docker
    web image (`docker/web/Dockerfile`) sets it so the runner can start
    `node apps/web/server.js`. Because standalone trace collection is flaky in
    this environment, `npm run build` wraps `next build` in
    `scripts/build-standalone.mjs`, which clears `.next` and retries (up to 4×)
    until the standalone output is produced deterministically.
  - `eslint.ignoreDuringBuilds: true` is set (see below).
- **Lint/build:** the repo's `@typescript-eslint` v8 flat config does not resolve rules under
  the existing `eslint.config.mjs` and produces spurious `no-explicit-any` "rule not found"
  errors. For this reason ESLint is disabled during `next build`. `npm run build` still runs
  the TypeScript type-check ("Linting and checking validity of types") and generates all
  static routes; run `npm run lint` separately if ESLint feedback is needed.
- **Host hardcoding:** UI code must not hardcode API hosts (e.g. `http://localhost:5000/api`
  inline in `fetch`). Use the typed `lib/api.ts` client or `lib/utils.ts` helpers
  (`API_BASE`, `getProductImageUrl`, `formatPrice`, `formatDate`).
- `npm run build` from `apps/web` currently validates **49 routes** (static + dynamic
  `[id]`/search routes).

---

## 9. Route map (49 routes)

Public/account:

`/`, `/saree`, `/kurthi`, `/top`, `/leggin`, `/cosmetics`, `/search`, `/product/[id]`,
`/cart`, `/checkout`, `/payment/success`, `/payment/failure`, `/orders/[id]`,
`/confirmation`, `/contact`, `/login`, `/verify`,
`/wishlist`, `/account`, `/account/profile`, `/account/addresses`, `/account/orders`,
`/account/notifications`, `/account/returns`, `/account/returns/request`, `/account/reviews`

Seller:

`/seller`, `/seller/signup`, `/seller/login`, `/seller/dashboard`, `/seller/products`,
`/seller/add-product`, `/seller/edit-product/[id]`, `/seller/orders`, `/seller/inventory`,
`/seller/profile`

Admin:

`/admin/dashboard`, `/admin/orders`, `/admin/orders/[id]`, `/admin/products`, `/admin/users`,
`/admin/sellers`, `/admin/returns`, `/admin/refunds`, `/admin/coupons`, `/admin/audit-logs`,
`/admin/analytics`

SEO/utility:

`/robots.txt`, `/sitemap.xml`, `/_not-found`

---

## 10. Key behaviours enforced in the UI

- **Order timeline** follows Confirmed → Processing → Shipped → **Out for Delivery** →
  Delivered, sourced from `ordersApi.history` (`historyData.history`) when present, falling
  back to `order.statusHistory`.
- **Payment trust:** `/payment/success` queries `paymentsApi.byCheckout(checkoutId)` directly
  and only shows "Order Placed Successfully!" when the payment is `CAPTURED` or
  `method === "cod"`; otherwise it shows "Confirming your order…" or "Payment Failed".
- **Stock awareness:** product detail and product cards reflect availability; quantities are
  bounded by available stock per selected size; out-of-stock disables add-to-cart/buy-now.
- **Verified purchase:** the review form surfaces a "Verified Purchase" indicator via the
  can-review check; `ReviewCard` renders a "Verified Purchase" badge when the review carries
  `isVerifiedPurchase` (displayed only when the API provides it).
- **Wishlist:** toggle from product card and product detail; wishlist page robustly filters
  missing/deleted products.
- **Forms:** pincode validates `/^[1-9]\d{5}$/`; phone validates `/^\d{10}$/`; seller image
  uploads are constrained to `image/*` under 5 MB with previews and a max of 6 images.
