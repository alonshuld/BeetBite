import { test as dbTest, expect } from '../fixtures/db.fixture';

const BASE = 'http://localhost:5174';

dbTest.describe('Subcontractors CRUD', () => {
  dbTest('create subcontractor → appears in list', async ({ page, db }) => {
    void db;
    await page.goto(`${BASE}/subcontractors`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /add subcontractor/i }).first().click();
    await page.fill('#sub-name', 'Automation Sub');
    await page.fill('#sub-company-number', '515111111');
    await page.getByRole('button', { name: /save/i }).click();

    await expect(
      page.getByRole('cell', { name: 'Automation Sub' }),
    ).toBeVisible({ timeout: 5000 });
  });

  dbTest('edit subcontractor → changes reflected', async ({ page, db }) => {
    await db.subcontractor.create({
      data: { name: 'Sub To Edit', companyNumber: '515111112' },
    });

    await page.goto(`${BASE}/subcontractors`);
    await page.waitForLoadState('networkidle');

    const row = page.getByRole('row', { name: /Sub To Edit/ });
    await row.getByTitle(/edit/i).click();

    const modal = page.locator('[role="dialog"], .fixed.inset-0').last();
    await expect(modal).toBeVisible();
    await page.fill('#sub-name', 'Sub Renamed');
    await page.waitForTimeout(100);
    await page.getByRole('button', { name: /save/i }).click();

    await expect(
      page.getByRole('cell', { name: 'Sub Renamed' }),
    ).toBeVisible({ timeout: 5000 });
  });

  dbTest('delete subcontractor → removed from list', async ({ page, db }) => {
    await db.subcontractor.create({
      data: { name: 'Sub To Delete', companyNumber: '515111113' },
    });

    await page.goto(`${BASE}/subcontractors`);
    await page.waitForLoadState('networkidle');

    const row = page.getByRole('row', { name: /Sub To Delete/ });
    await row.getByTitle(/delete/i).click();
    await page.getByRole('button', { name: /delete/i }).last().click();

    await expect(
      page.getByRole('cell', { name: 'Sub To Delete' }),
    ).not.toBeVisible({ timeout: 5000 });
  });

  dbTest('duplicate name rejected', async ({ page, db }) => {
    await db.subcontractor.create({
      data: { name: 'Unique Sub', companyNumber: '515111114' },
    });

    await page.goto(`${BASE}/subcontractors`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /add subcontractor/i }).first().click();
    await page.fill('#sub-name', 'Unique Sub');
    await page.fill('#sub-company-number', '515111115');
    await page.getByRole('button', { name: /save/i }).click();

    await expect(page.locator('[role="dialog"], .fixed.inset-0').last()).toBeVisible({
      timeout: 3000,
    });
  });

  dbTest('duplicate company number rejected', async ({ page, db }) => {
    await db.subcontractor.create({
      data: { name: 'Company Number Owner', companyNumber: '515111116' },
    });

    await page.goto(`${BASE}/subcontractors`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /add subcontractor/i }).first().click();
    await page.fill('#sub-name', 'Different Name');
    await page.fill('#sub-company-number', '515111116');
    await page.getByRole('button', { name: /save/i }).click();

    await expect(page.locator('[role="dialog"], .fixed.inset-0').last()).toBeVisible({
      timeout: 3000,
    });
  });
});
