import { test as dbTest, expect } from '../fixtures/db.fixture';

const BASE = 'http://localhost:5174';

dbTest.describe('Corporations CRUD', () => {
  dbTest('create corporation → appears in list', async ({ page, db }) => {
    void db;
    await page.goto(`${BASE}/corporations`);
    await page.waitForLoadState('networkidle');

    await page
      .getByRole('button', { name: /add corporation/i })
      .first()
      .click();
    await page.fill('#corp-name', 'Automation Corp');
    await page.getByRole('button', { name: /save/i }).click();

    await expect(
      page.getByRole('cell', { name: 'Automation Corp' }),
    ).toBeVisible({ timeout: 5000 });
  });

  dbTest('edit corporation → changes reflected', async ({ page, db }) => {
    await db.corporation.create({ data: { name: 'Corp To Edit' } });

    await page.goto(`${BASE}/corporations`);
    await page.waitForLoadState('networkidle');

    const row = page.getByRole('row', { name: /Corp To Edit/ });
    await row.getByTitle(/edit/i).click();

    const modal = page.locator('[role="dialog"], .fixed.inset-0').last();
    await expect(modal).toBeVisible();
    await page.fill('#corp-name', 'Corp Renamed');
    await page.waitForTimeout(100);
    await page.getByRole('button', { name: /save/i }).click();

    await expect(page.getByRole('cell', { name: 'Corp Renamed' })).toBeVisible({
      timeout: 5000,
    });
  });

  dbTest('delete corporation → removed from list', async ({ page, db }) => {
    await db.corporation.create({ data: { name: 'Corp To Delete' } });

    await page.goto(`${BASE}/corporations`);
    await page.waitForLoadState('networkidle');

    const row = page.getByRole('row', { name: /Corp To Delete/ });
    await row.getByTitle(/delete/i).click();
    await page
      .getByRole('button', { name: /delete/i })
      .last()
      .click();

    await expect(
      page.getByRole('cell', { name: 'Corp To Delete' }),
    ).not.toBeVisible({ timeout: 5000 });
  });

  dbTest('duplicate name rejected', async ({ page, db }) => {
    await db.corporation.create({ data: { name: 'Unique Corp' } });

    await page.goto(`${BASE}/corporations`);
    await page.waitForLoadState('networkidle');

    await page
      .getByRole('button', { name: /add corporation/i })
      .first()
      .click();
    await page.fill('#corp-name', 'Unique Corp');
    await page.getByRole('button', { name: /save/i }).click();

    await expect(
      page.locator('[role="dialog"], .fixed.inset-0').last(),
    ).toBeVisible({
      timeout: 3000,
    });
  });
});
