import { test as dbTest, expect } from '../fixtures/db.fixture';

const BASE = 'http://localhost:5174';

dbTest.describe('Clients CRUD', () => {
  dbTest('create client → appears in list', async ({ page, db }) => {
    void db; // fixture handles cleanup
    await page.goto(`${BASE}/clients`);
    await page.waitForLoadState('networkidle');

    await page
      .getByRole('button', { name: /add client/i })
      .first()
      .click();

    const modal = page.locator('[role="dialog"], .fixed.inset-0').last();
    await expect(modal).toBeVisible();

    await page.fill('#client-name', 'Automation Test Client');
    await page.getByRole('button', { name: /save/i }).click();

    await expect(
      page.getByRole('cell', { name: 'Automation Test Client' }),
    ).toBeVisible({ timeout: 5000 });
  });

  dbTest('edit client → changes reflected in list', async ({ page, db }) => {
    await db.client.create({ data: { name: 'Edit Target Client' } });

    await page.goto(`${BASE}/clients`);
    await page.waitForLoadState('networkidle');

    const row = page.getByRole('row', { name: /Edit Target Client/ });
    await row.getByTitle(/edit/i).click();

    const modal = page.locator('[role="dialog"], .fixed.inset-0').last();
    await expect(modal).toBeVisible();
    await page.fill('#client-name', 'Renamed Client');
    await page.waitForTimeout(100);
    await page.getByRole('button', { name: /save/i }).click();

    await expect(
      page.getByRole('cell', { name: 'Renamed Client' }),
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByRole('cell', { name: 'Edit Target Client' }),
    ).not.toBeVisible();
  });

  dbTest('delete client → removed from list', async ({ page, db }) => {
    await db.client.create({ data: { name: 'Delete Me Client' } });

    await page.goto(`${BASE}/clients`);
    await page.waitForLoadState('networkidle');

    const row = page.getByRole('row', { name: /Delete Me Client/ });
    await row.getByTitle(/delete/i).click();

    // Confirm modal
    await page
      .getByRole('button', { name: /delete/i })
      .last()
      .click();

    await expect(
      page.getByRole('cell', { name: 'Delete Me Client' }),
    ).not.toBeVisible({ timeout: 5000 });
  });

  dbTest('duplicate name shows error (409)', async ({ page, db }) => {
    await db.client.create({ data: { name: 'Unique Client Name' } });

    await page.goto(`${BASE}/clients`);
    await page.waitForLoadState('networkidle');

    await page
      .getByRole('button', { name: /add client/i })
      .first()
      .click();
    await page.fill('#client-name', 'Unique Client Name');
    await page.getByRole('button', { name: /save/i }).click();

    // Modal should stay open (or error shown) — duplicate name rejected
    await expect(
      page.locator('[role="dialog"], .fixed.inset-0').last(),
    ).toBeVisible({
      timeout: 3000,
    });
  });

  dbTest(
    'empty name field — form validation prevents submit',
    async ({ page, db }) => {
      void db;
      await page.goto(`${BASE}/clients`);
      await page.waitForLoadState('networkidle');

      await page
        .getByRole('button', { name: /add client/i })
        .first()
        .click();
      // Leave name empty
      await page.getByRole('button', { name: /save/i }).click();

      // Modal stays open (name is required)
      await expect(
        page.locator('[role="dialog"], .fixed.inset-0').last(),
      ).toBeVisible({
        timeout: 2000,
      });
    },
  );
});
