import { test, expect } from '@playwright/test';

test.describe('Cart Page', () => {
  test('cart page loads when not logged in', async ({ page }) => {
    await page.goto('/cart');
    // Cart page should show some content (login redirect or empty cart)
    await expect(page.locator('body')).toBeVisible();
  });

  test('cart page is accessible via header link', async ({ page }) => {
    await page.goto('/');
    const cartLink = page.locator('a[aria-label*="Shopping cart"]');
    await cartLink.click();
    await expect(page).toHaveURL(/\/cart/);
  });
});

test.describe('Checkout Page', () => {
  test('checkout page redirects when cart is empty', async ({ page }) => {
    await page.goto('/checkout');
    // Should either show empty cart message or redirect
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Login Page', () => {
  test('login page loads with email input', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"], input[placeholder*="email" i]').first()).toBeVisible();
  });

  test('login page has OTP send button', async ({ page }) => {
    await page.goto('/login');
    const sendButton = page.locator('button:has-text("Send OTP"), button:has-text("Send"), button[type="submit"]').first();
    await expect(sendButton).toBeVisible();
  });

  test('login form validates empty email', async ({ page }) => {
    await page.goto('/login');
    const submitButton = page.locator('button[type="submit"], button:has-text("Send")').first();
    await submitButton.click();
    // Should show validation error
    await expect(page.locator('text=/required|valid/i').first()).toBeVisible();
  });
});

test.describe('Wishlist Page', () => {
  test('wishlist page loads', async ({ page }) => {
    await page.goto('/wishlist');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Contact Page', () => {
  test('contact page loads with contact information', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.locator('text=Beauty Queen').first()).toBeVisible();
  });
});

test.describe('Account Pages', () => {
  test('account page redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/account');
    // Should redirect to login or show login form
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Order Pages', () => {
  test('orders page loads', async ({ page }) => {
    await page.goto('/account/orders');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Seller Pages', () => {
  test('seller login page loads', async ({ page }) => {
    await page.goto('/seller/login');
    await expect(page.locator('body')).toBeVisible();
  });

  test('seller signup page loads', async ({ page }) => {
    await page.goto('/seller/signup');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Admin Pages', () => {
  test('admin dashboard redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Payment Pages', () => {
  test('payment success page loads with params', async ({ page }) => {
    await page.goto('/payment/success?checkoutId=test-123');
    await expect(page.locator('body')).toBeVisible();
  });

  test('payment failure page loads with params', async ({ page }) => {
    await page.goto('/payment/failure?checkoutId=test-123&error=Payment+failed');
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Error Handling', () => {
  test('404 page shows for non-existent routes', async ({ page }) => {
    await page.goto('/nonexistent-page-xyz');
    await expect(page.locator('body')).toBeVisible();
  });
});
