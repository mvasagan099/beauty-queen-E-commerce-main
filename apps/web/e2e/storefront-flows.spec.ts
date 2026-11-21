import { test, expect } from '@playwright/test';

test.describe('3D Atelier Flagship Homepage', () => {
  test('renders 3D couture canvas and interactive department switcher', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('canvas[aria-label*="3D couture sculpture"]')).toBeVisible();

    const cosmeticsTab = page.getByRole('tab', { name: 'Cosmetics' });
    await expect(cosmeticsTab).toBeVisible();
    await cosmeticsTab.click();
    await expect(cosmeticsTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('text=3D Crystal Flacon & Lip')).toBeVisible();
  });

  test('flips a collection runway card to show craft details', async ({ page }) => {
    await page.goto('/');
    const detailsBtn = page.locator('button[aria-label="Inspect Saree craft details"]');
    await expect(detailsBtn).toBeVisible();
    await detailsBtn.click();
    await expect(page.locator('text=Available fits').first()).toBeVisible();
  });
});

test.describe('Faceted Catalog Discovery & Dynamic Collections', () => {
  test('category page opens filter panel and syncs URL params', async ({ page }) => {
    await page.goto('/saree');
    const filterBtn = page.getByRole('button', { name: /Filters/i });
    await expect(filterBtn).toBeVisible();
    await filterBtn.click();

    await page.getByRole('button', { name: 'Free Size' }).click();
    await expect(page).toHaveURL(/size=FREE_SIZE/);

    await page.getByRole('button', { name: /Clear all/i }).click();
    await expect(page).toHaveURL(/\/saree$/);
  });

  test('dynamic /collections/[slug] route renders cleanly', async ({ page }) => {
    await page.goto('/collections/bridal-silk-edit');
    await expect(page.getByRole('heading', { name: /Bridal Silk Edit/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Filters/i })).toBeVisible();
  });
});

test.describe('Admin Route Protection', () => {
  test('admin categories page redirects unauthenticated visitors to login', async ({ page }) => {
    await page.goto('/admin/categories');
    await expect(page).toHaveURL(/\/login/);
  });
});
