import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5174';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Authentication', () => {
  test('valid login redirects to /reports', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.fill('#username', 'e2e-admin');
    await page.fill('#password', 'E2eTest1234!');
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE}/reports`);
    await expect(page).toHaveURL(/\/reports/);
  });

  test('invalid credentials shows error message', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.fill('#username', 'e2e-admin');
    await page.fill('#password', 'wrong-password');
    await page.click('button[type="submit"]');
    // Error should appear — backend returns 401
    const error = page.locator('p.text-danger, [class*="danger"]');
    await expect(error).toBeVisible({ timeout: 5000 });
  });

  test('empty fields shows validation error', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.click('button[type="submit"]');
    const error = page.locator('p.text-danger, [class*="danger"]');
    await expect(error).toBeVisible({ timeout: 3000 });
  });

  test('unauthenticated access to /reports redirects to /login', async ({
    page,
  }) => {
    await page.goto(`${BASE}/reports`);
    await page.waitForURL(`${BASE}/login`);
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated access to /clients redirects to /login', async ({
    page,
  }) => {
    await page.goto(`${BASE}/clients`);
    await page.waitForURL(`${BASE}/login`);
    await expect(page).toHaveURL(/\/login/);
  });

  test('logout clears token and redirects to /login', async ({ page }) => {
    // First login
    await page.goto(`${BASE}/login`);
    await page.fill('#username', 'e2e-admin');
    await page.fill('#password', 'E2eTest1234!');
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE}/reports`);

    // Click sign out button in sidebar
    await page.click('button[title="Sign out"], aside button[title]');
    await page.waitForURL(`${BASE}/login`);
    await expect(page).toHaveURL(/\/login/);

    // Navigating back to reports should redirect to login
    await page.goto(`${BASE}/reports`);
    await expect(page).toHaveURL(/\/login/);
  });

  test('page refresh while logged in keeps session', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.fill('#username', 'e2e-admin');
    await page.fill('#password', 'E2eTest1234!');
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE}/reports`);

    await page.reload();
    await expect(page).toHaveURL(/\/reports/);
    await expect(page.locator('aside')).toBeVisible();
  });
});
