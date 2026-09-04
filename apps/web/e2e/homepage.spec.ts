import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('loads and displays the Beauty Queen brand', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Beauty Queen').first()).toBeVisible();
  });

  test('displays category navigation links', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('nav a[href="/saree"]')).toBeVisible();
    await expect(page.locator('nav a[href="/kurthi"]')).toBeVisible();
    await expect(page.locator('nav a[href="/top"]')).toBeVisible();
    await expect(page.locator('nav a[href="/leggin"]')).toBeVisible();
    await expect(page.locator('nav a[href="/cosmetics"]')).toBeVisible();
  });

  test('displays search input', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('input[aria-label="Search products"]').first()).toBeVisible();
  });

  test('has a cart link in the header', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('a[aria-label*="Shopping cart"]')).toBeVisible();
  });

  test('skip-to-content link is present and keyboard accessible', async ({ page }) => {
    await page.goto('/');
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeHidden();
    await page.keyboard.press('Tab');
    await expect(skipLink).toBeVisible();
  });

  test('has correct page title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Beauty Queen/);
  });
});

test.describe('Category Pages', () => {
  const categories = [
    { name: 'Saree', href: '/saree' },
    { name: 'Kurthi', href: '/kurthi' },
    { name: 'Top', href: '/top' },
    { name: 'Leggin', href: '/leggin' },
    { name: 'Cosmetics', href: '/cosmetics' },
  ];

  for (const cat of categories) {
    test(`${cat.name} category page loads`, async ({ page }) => {
      await page.goto(cat.href);
      await expect(page.locator(`text=${cat.name}`).first()).toBeVisible();
    });
  }
});

test.describe('Product Pages', () => {
  test('product detail page loads with product info', async ({ page }) => {
    await page.goto('/');
    // Wait for homepage products to load
    const productLink = page.locator('a[href^="/product/"]').first();
    if (await productLink.isVisible()) {
      await productLink.click();
      await expect(page).toHaveURL(/\/product\/\d+/);
      await expect(page.locator('text=Add to Cart').first()).toBeVisible();
    }
  });
});

test.describe('Search', () => {
  test('search form submits and navigates to search page', async ({ page }) => {
    await page.goto('/');
    const searchInput = page.locator('input[aria-label="Search products"]').first();
    await searchInput.fill('saree');
    await searchInput.press('Enter');
    await expect(page).toHaveURL(/\/search\?q=saree/);
  });
});

test.describe('Footer', () => {
  test('footer is present with category links', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer[role="contentinfo"]');
    await expect(footer).toBeVisible();
    await expect(footer.locator('a[href="/saree"]')).toBeVisible();
    await expect(footer.locator('a[href="/contact"]')).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test('mobile menu opens and closes', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const menuButton = page.locator('button[aria-label="Open navigation menu"]');
    await menuButton.click();
    await expect(page.locator('button[aria-label="Close navigation"]')).toBeVisible();
  });
});

test.describe('Responsive Design', () => {
  test('renders on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await expect(page.locator('text=Beauty Queen').first()).toBeVisible();
  });

  test('renders on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await expect(page.locator('text=Beauty Queen').first()).toBeVisible();
  });

  test('renders on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.locator('text=Beauty Queen').first()).toBeVisible();
  });
});
