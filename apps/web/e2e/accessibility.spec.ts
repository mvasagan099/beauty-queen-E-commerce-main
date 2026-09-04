import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test('skip-to-content link exists and works', async ({ page }) => {
    await page.goto('/');
    // Skip link should be hidden initially
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeHidden();
    // After Tab, it should become visible
    await page.keyboard.press('Tab');
    await expect(skipLink).toBeVisible();
    // Focus main content after clicking
    await skipLink.click();
    const main = page.locator('#main-content');
    await expect(main).toBeFocused();
  });

  test('main landmark has id for skip link', async ({ page }) => {
    await page.goto('/');
    const main = page.locator('main#main-content');
    await expect(main).toBeVisible();
  });

  test('header has navigation landmark with label', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav[aria-label="Main navigation"]');
    await expect(nav).toBeVisible();
  });

  test('footer has contentinfo role', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer[role="contentinfo"]');
    await expect(footer).toBeVisible();
  });

  test('search input has aria-label', async ({ page }) => {
    await page.goto('/');
    const searchInput = page.locator('input[aria-label="Search products"]').first();
    await expect(searchInput).toBeVisible();
  });

  test('cart link has descriptive aria-label', async ({ page }) => {
    await page.goto('/');
    const cartLink = page.locator('a[aria-label*="Shopping cart"]');
    await expect(cartLink).toBeVisible();
  });

  test('all form fields have associated labels on login page', async ({ page }) => {
    await page.goto('/login');
    // Check that inputs have labels or aria-label
    const inputs = page.locator('input');
    const count = await inputs.count();
    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const hasLabel = await input.evaluate((el) => {
        const id = el.getAttribute('id');
        const ariaLabel = el.getAttribute('aria-label');
        const ariaLabelledBy = el.getAttribute('aria-labelledby');
        const hasAssociatedLabel = id ? !!document.querySelector(`label[for="${id}"]`) : false;
        return !!(ariaLabel || ariaLabelledBy || hasAssociatedLabel);
      });
      expect(hasLabel).toBeTruthy();
    }
  });

  test('page has lang attribute on html', async ({ page }) => {
    await page.goto('/');
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBe('en');
  });

  test('product images have alt text', async ({ page }) => {
    await page.goto('/');
    // Wait for product images to load
    await page.waitForTimeout(2000);
    const images = page.locator('img[alt]');
    const count = await images.count();
    if (count > 0) {
      for (let i = 0; i < Math.min(count, 5); i++) {
        const alt = await images.nth(i).getAttribute('alt');
        expect(alt).toBeTruthy();
        expect(alt?.length).toBeGreaterThan(0);
      }
    }
  });
});
