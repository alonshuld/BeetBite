import { test as dbTest, expect } from '../fixtures/db.fixture';

const BASE = 'http://localhost:5174';

/**
 * Cross-cutting routing and error-surface behaviour that no feature spec owns.
 */
dbTest.describe('Routing and error surfaces', () => {
  dbTest('an unknown route renders the 404 page', async ({ page, db }) => {
    void db;
    await page.goto(`${BASE}/no-such-page`);

    // NotFoundPage sits outside the shell, so the sidebar must not be there.
    await expect(page.getByText('404')).toBeVisible();
    await expect(page.getByRole('link', { name: /Clients/ })).toHaveCount(0);
  });

  dbTest('the index route redirects to /reports', async ({ page, db }) => {
    void db;
    await page.goto(`${BASE}/`);

    await expect(page).toHaveURL(/\/reports$/);
  });

  dbTest(
    'the retired simulator route redirects to /reports',
    async ({ page, db }) => {
      void db;
      await page.goto(`${BASE}/simulator`);

      await expect(page).toHaveURL(/\/reports$/);
    },
  );

  dbTest(
    'a failing write surfaces the server message as a toast',
    async ({ page, db }) => {
      await db.client.create({ data: { name: 'Duplicate Target' } });

      await page.goto(`${BASE}/clients`);
      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: '+ Add' }).first().click();
      await page.getByLabel('Name').fill('Duplicate Target');
      await page.getByRole('button', { name: 'Save' }).click();

      // baseApi's error branch emits the server's message, not a generic string.
      await expect(page.getByText(/already exists/i)).toBeVisible();
    },
  );
});
