import { test as dbTest, expect } from '../fixtures/db.fixture';

const BASE = 'http://localhost:5174';

dbTest.describe('Subcontractor Payments', () => {
  dbTest.beforeEach(async ({ db }) => {
    const client = await db.client.create({ data: { name: 'SubPay Client' } });
    const subcontractor = await db.subcontractor.create({
      data: { name: 'SubPay Worker' },
    });
    const project = await db.project.create({
      data: {
        clientId: client.id,
        name: 'SubPay Project',
        estimatedAmount: 200000,
        finishDate: new Date('2027-12-31'),
        description: 'Subcontractor payment tests',
      },
    });
    // Create a project report for the current test month so the subcontractor appears
    await db.projectReport.create({
      data: {
        projectId: project.id,
        subcontractorId: subcontractor.id,
        date: new Date('2026-05-01'),
        profitMargin: 10,
        income: 50000,
        incomeDate: new Date('2026-05-15'),
      },
    });
  });

  dbTest('add partial payment → total paid updates in subcontractor card', async ({
    page,
    db,
  }) => {
    void db;
    await page.goto(`${BASE}/subcontractor-payments`);
    await page.waitForLoadState('networkidle');

    // Click on the subcontractor card
    await page.getByText('SubPay Worker').first().click();

    // Open add instalment modal
    await page
      .getByTitle(/add instalment/i)
      .first()
      .click();

    await page.selectOption('#inst-project', { label: 'SubPay Project' });
    await page.fill('#inst-amount', '10000');
    await page.getByRole('button', { name: /save/i }).click();

    // After save, modal closes and total paid should update
    await expect(page.locator('[role="dialog"], .fixed.inset-0')).not.toBeVisible({
      timeout: 5000,
    });

    // Verify the paid amount appears in the UI
    await expect(page.getByText(/10,000|10000/).first()).toBeVisible({ timeout: 5000 });
  });

  dbTest('overpay guard: payment exceeding amount owed is rejected', async ({
    page,
    db,
  }) => {
    void db;
    // Amount owed = income - (income × margin%) = 50000 - 5000 = 45000
    // Attempting to pay 50000 should exceed the owed amount

    await page.goto(`${BASE}/subcontractor-payments`);
    await page.waitForLoadState('networkidle');

    await page.getByText('SubPay Worker').first().click();

    await page
      .getByTitle(/add instalment/i)
      .first()
      .click();

    await page.selectOption('#inst-project', { label: 'SubPay Project' });
    await page.fill('#inst-amount', '50000');
    await page.getByRole('button', { name: /save/i }).click();

    // Modal closes after save attempt
    await expect(page.locator('[role="dialog"], .fixed.inset-0')).not.toBeVisible({
      timeout: 5000,
    });

    // Backend rejected overpayment — paid amount of 50000 must NOT appear
    await expect(page.getByText(/50,000|50000/)).not.toBeVisible({ timeout: 3000 });
  });

  dbTest('multiple partial payments up to limit are accepted', async ({
    page,
    db,
  }) => {
    void db;
    // Owed = 45000, add two payments of 20000 each (total 40000 < 45000)
    await page.goto(`${BASE}/subcontractor-payments`);
    await page.waitForLoadState('networkidle');

    await page.getByText('SubPay Worker').first().click();

    // First payment
    await page.getByTitle(/add instalment/i).first().click();
    await page.selectOption('#inst-project', { label: 'SubPay Project' });
    await page.fill('#inst-amount', '20000');
    await page.getByRole('button', { name: /save/i }).click();
    await expect(page.locator('[role="dialog"], .fixed.inset-0')).not.toBeVisible({
      timeout: 5000,
    });

    // Second payment
    await page.getByTitle(/add instalment/i).first().click();
    await page.selectOption('#inst-project', { label: 'SubPay Project' });
    await page.fill('#inst-amount', '20000');
    await page.getByRole('button', { name: /save/i }).click();
    await expect(page.locator('[role="dialog"], .fixed.inset-0')).not.toBeVisible({
      timeout: 5000,
    });

    // Total 40000 should be shown
    await expect(page.getByText(/40,000|40000/).first()).toBeVisible({ timeout: 5000 });
  });
});
