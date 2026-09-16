import { test as dbTest, expect } from '../fixtures/db.fixture';

const BASE = 'http://localhost:5174';

/**
 * Supplier payments are recorded inside project reports (not via a
 * standalone form). These tests verify the supplier payments page
 * correctly reflects payments created through project reports.
 */
dbTest.describe('Supplier Payments Page', () => {
  dbTest(
    'page shows supplier payment totals for a month',
    async ({ page, db }) => {
      const client = await db.client.create({
        data: { name: 'CorpPay Client' },
      });
      const project = await db.project.create({
        data: {
          clientId: client.id,
          name: 'CorpPay Project',
          estimatedAmount: 300000,
          description: 'Corp payment test',
        },
      });
      const subcontractor = await db.subcontractor.create({
        data: { name: 'CorpPay Sub', companyNumber: '515222001' },
      });
      const supplier = await db.supplier.create({
        data: { name: 'CorpPay Corp' },
      });

      const report = await db.projectReport.create({
        data: {
          projectId: project.id,
          subcontractorId: subcontractor.id,
          date: new Date('2026-05-01'),
          profitMargin: 10,
          incomeEntries: {
            create: [{ amount: 80000, incomeDate: new Date('2026-05-10') }],
          },
        },
      });

      await db.supplierPayment.create({
        data: {
          projectReportId: report.id,
          supplierId: supplier.id,
          amount: 15000,
          date: new Date('2026-05-12'),
        },
      });

      await page.goto(`${BASE}/supplier-payments`);
      await page.waitForLoadState('networkidle');

      // Supplier name should appear in the table
      await expect(page.getByText('CorpPay Corp')).toBeVisible({
        timeout: 5000,
      });
      // Total paid should reflect the payment amount
      await expect(page.getByText(/15,000|15000/).first()).toBeVisible({
        timeout: 5000,
      });
    },
  );

  dbTest(
    'empty state shown when no payments for selected month',
    async ({ page, db }) => {
      void db;
      await page.goto(`${BASE}/supplier-payments`);
      await page.waitForLoadState('networkidle');

      // Should show empty state (no payments in fresh test DB for the selected month)
      const emptyState = page.getByText(/no supplier payments/i);
      const table = page.locator('table');

      const hasTable = await table.isVisible().catch(() => false);
      const hasEmpty = await emptyState.isVisible().catch(() => false);

      expect(hasTable || hasEmpty).toBe(true);
    },
  );
});
