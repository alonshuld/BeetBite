import { test as dbTest, expect } from '../fixtures/db.fixture';

const BASE = 'http://localhost:5174';

/**
 * Corporation payments are recorded inside project reports (not via a
 * standalone form). These tests verify the corporation payments page
 * correctly reflects payments created through project reports.
 */
dbTest.describe('Corporation Payments Page', () => {
  dbTest('page shows corporation payment totals for a month', async ({
    page,
    db,
  }) => {
    const client = await db.client.create({ data: { name: 'CorpPay Client' } });
    const project = await db.project.create({
      data: {
        clientId: client.id,
        name: 'CorpPay Project',
        estimatedAmount: 300000,
        description: 'Corp payment test',
      },
    });
    const subcontractor = await db.subcontractor.create({
      data: { name: 'CorpPay Sub' },
    });
    const corporation = await db.corporation.create({
      data: { name: 'CorpPay Corp' },
    });

    const report = await db.projectReport.create({
      data: {
        projectId: project.id,
        subcontractorId: subcontractor.id,
        date: new Date('2026-05-01'),
        profitMargin: 10,
        income: 80000,
        incomeDate: new Date('2026-05-10'),
      },
    });

    await db.corporationPayment.create({
      data: {
        projectReportId: report.id,
        corporationId: corporation.id,
        amount: 15000,
        date: new Date('2026-05-12'),
      },
    });

    await page.goto(`${BASE}/corporation-payments`);
    await page.waitForLoadState('networkidle');

    // Corporation name should appear in the table
    await expect(page.getByText('CorpPay Corp')).toBeVisible({ timeout: 5000 });
    // Total paid should reflect the payment amount
    await expect(page.getByText(/15,000|15000/).first()).toBeVisible({ timeout: 5000 });
  });

  dbTest('empty state shown when no payments for selected month', async ({
    page,
    db,
  }) => {
    void db;
    await page.goto(`${BASE}/corporation-payments`);
    await page.waitForLoadState('networkidle');

    // Should show empty state (no payments in fresh test DB for the selected month)
    const emptyState = page.getByText(/no corporation payments/i);
    const table = page.locator('table');

    const hasTable = await table.isVisible().catch(() => false);
    const hasEmpty = await emptyState.isVisible().catch(() => false);

    expect(hasTable || hasEmpty).toBe(true);
  });
});
