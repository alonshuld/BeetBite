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
    // On desktop the sidebar is a floating card with a border on every side,
    // so its border no longer says which edge it hugs. Where it is drawn
    // does: it sits against the left edge in English and the right in Hebrew,
    // which only happens if the direction actually flipped the layout.
    const sidebar = page.locator('aside').first();
    const viewportWidth = page.viewportSize()!.width;
    const centreX = async () => {
      const box = (await sidebar.boundingBox())!;
      return box.x + box.width / 2;
    };

    await expect.poll(centreX).toBeLessThan(viewportWidth / 2);

    await page.getByRole('button', { name: 'עב' }).click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

    await expect.poll(centreX).toBeGreaterThan(viewportWidth / 2);
  });
});
