import { test as dbTest, expect } from '../fixtures/db.fixture';
import type { Page } from '@playwright/test';

const BASE = 'http://localhost:5174';

/** What the browser bars around the page are painted with. */
async function browserChrome(page: Page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const style = getComputedStyle(root);
    return {
      theme: root.getAttribute('data-theme'),
      colorScheme: style.colorScheme,
      bg: style.getPropertyValue('--bg').trim(),
      themeColor: document
        .querySelector('meta[name="theme-color"]')
        ?.getAttribute('content'),
    };
  });
}

/**
 * Safari paints its status bar and toolbar from the page's first paint and its
 * theme-color. The dark theme used to be applied only once React had mounted,
 * so a dark page sat between light bars.
 */
dbTest.describe('Theme and the browser bars', () => {
  dbTest(
    'a saved dark theme is applied before the app script runs',
    async ({ page, db }) => {
      void db;
      await page.addInitScript(() =>
        localStorage.setItem('beetbite.theme', 'dark'),
      );
      // Without the app bundle nothing but index.html can set the theme.
      await page.route('**/src/main.tsx', (route) => route.abort());

      await page.goto(`${BASE}/clients`);

      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    },
  );

  dbTest(
    'theme-color and color-scheme follow the theme toggle',
    async ({ page, db }) => {
      void db;
      await page.goto(`${BASE}/clients`);
      await page.waitForLoadState('networkidle');

      const light = await browserChrome(page);
      expect(light.theme).toBeNull();
      expect(light.colorScheme).toBe('light');
      expect(light.themeColor).toBe(light.bg);

      await page.getByRole('button', { name: 'Toggle theme' }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

      const dark = await browserChrome(page);
      expect(dark.colorScheme).toBe('dark');
      expect(dark.bg).not.toBe(light.bg);
      expect(dark.themeColor).toBe(dark.bg);

      // And straight from a reload, not only after a toggle.
      await page.reload();
      await page.waitForLoadState('networkidle');
      expect(await browserChrome(page)).toEqual(dark);
    },
  );

  dbTest(
    'a language switch does not slide the closed phone menu across the screen',
    async ({ page, db }) => {
      void db;
      // The menu is a drawer only below lg.
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`${BASE}/clients`);
      await page.waitForLoadState('networkidle');

      // Switching flips the side the drawer parks on. It used to slide across
      // the screen on its way there, and Safari kept its colour for its bars.
      const menu = page.locator('aside');
      await expect(menu).toBeHidden();
      await page.getByRole('button', { name: 'עב' }).click();
      await expect(menu).toBeHidden();
      await page.getByRole('button', { name: 'EN', exact: true }).click();
      await expect(menu).toBeHidden();

      await page.getByRole('button', { name: 'Open menu' }).click();
      await expect(menu).toBeVisible();
    },
  );
});
