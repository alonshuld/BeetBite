import { test as dbTest, expect } from '../fixtures/db.fixture';

const BASE = 'http://localhost:5174';

/**
 * Language and direction behaviour. PR #46 shipped the EN/HE toggle with an
 * entirely manual test plan; this automates it.
 */
dbTest.describe('Language and direction', () => {
  dbTest.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/clients`);
    await page.waitForLoadState('networkidle');
  });

  dbTest('defaults to English and left-to-right', async ({ page, db }) => {
    void db;
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.getByRole('link', { name: /Clients/ })).toBeVisible();
  });

  dbTest(
    'switching to Hebrew flips direction and labels',
    async ({ page, db }) => {
      void db;
      await page.getByRole('button', { name: 'עב' }).click();

      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      await expect(page.getByRole('link', { name: /לקוחות/ })).toBeVisible();
    },
  );

  dbTest('the choice survives a reload', async ({ page, db }) => {
    void db;
    await page.getByRole('button', { name: 'עב' }).click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    expect(
      await page.evaluate(() => localStorage.getItem('beetbite.lang')),
    ).toBe('he');
  });

  dbTest(
    'switching back to English restores direction',
    async ({ page, db }) => {
      void db;
      await page.getByRole('button', { name: 'עב' }).click();
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

      await page.getByRole('button', { name: 'EN' }).click();

      await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    },
  );

  dbTest('the sidebar swaps edges under RTL', async ({ page, db }) => {
    void db;
    // The sidebar's outer edge is declared as `ltr:border-r rtl:border-l`, so
    // the rendered edge is what proves the direction variant actually resolved.
    // (The active nav link carries no accent border of its own — it is marked
    // by a tinted background, which is the same on both sides.)
    const sidebar = page.locator('aside').first();
    await expect(sidebar).toHaveCSS('border-right-width', '1px');
    await expect(sidebar).toHaveCSS('border-left-width', '0px');

    await page.getByRole('button', { name: 'עב' }).click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

    await expect(sidebar).toHaveCSS('border-left-width', '1px');
    await expect(sidebar).toHaveCSS('border-right-width', '0px');
  });
});
