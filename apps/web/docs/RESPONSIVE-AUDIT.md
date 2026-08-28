# Responsive UI Audit

## Breakpoints Tested

| Breakpoint | Width | Description |
|---|---|---|
| Mobile S | 360px | Small mobile |
| Mobile M | 390px | Standard mobile |
| Tablet | 768px | Tablet |
| Desktop S | 1024px | Small desktop |
| Desktop M | 1280px | Standard desktop |
| Desktop L | 1440px+ | Large desktop |

## Components Verified

### Header
- **Mobile**: Hamburger menu, slide-out navigation
- **Tablet**: Category links, search, cart
- **Desktop**: Full navigation, search bar, auth links

### Product Grid
- **Mobile**: 2 columns
- **Tablet**: 3 columns
- **Desktop**: 4 columns

### Product Detail
- **Mobile**: Stacked layout (image top, details bottom)
- **Desktop**: Side-by-side (image left, details right)

### Search
- **Mobile**: Full-width search results
- **Desktop**: Grid with sidebar controls

### Cart/Checkout
- **Mobile**: Stacked form fields
- **Desktop**: Two-column layout

### Footer
- **Mobile**: Single column
- **Tablet**: Two columns
- **Desktop**: Three columns

## Mobile Menu
- Slide-out panel from right
- Overlay backdrop
- Close on outside click
- Body scroll lock when open
- All navigation items preserved
- Auth links included

## Image Handling
- Responsive `sizes` attribute on all `next/image` uses
- Aspect ratio preserved across breakpoints
- Lazy loading for below-fold images
- Priority loading for above-fold hero

## Known Considerations
- Category sorting dropdown works on all screen sizes
- Pagination controls are touch-friendly (44px min tap target)
- Form inputs have proper viewport width handling
- Text doesn't overflow on small screens (truncation with ellipsis)
