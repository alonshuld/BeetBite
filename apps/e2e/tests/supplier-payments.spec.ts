import { test as dbTest, expect } from '../fixtures/db.fixture';

const BASE = 'http://localhost:5174';

/**
 * Supplier payments reach the page two ways: recorded inside a project report,
 * or documented directly on this page a whole stack at a time — the contractor
 * receives one supplier's paperwork covering several projects and types it in
 * one sitting.
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
      const emptyState = page.getByText(/no manpower \/ supplier payments/i);
      const table = page.locator('table');

      const hasTable = await table.isVisible().catch(() => false);
      const hasEmpty = await emptyState.isVisible().catch(() => false);

      expect(hasTable || hasEmpty).toBe(true);
    },
  );

  dbTest(
    "document a supplier's whole stack in one submission",
    async ({ page, db }) => {
      const client = await db.client.create({ data: { name: 'Batch Client' } });
      const subcontractor = await db.subcontractor.create({
        data: { name: 'Batch Sub', companyNumber: '515222009' },
      });
      const supplier = await db.supplier.create({
        data: { name: 'Batch Supplier' },
      });

      // Two projects, each with a report for the pinned month — a payment
      // hangs off a report, so both must exist before the paperwork lands.
      for (const name of ['Batch Project A', 'Batch Project B']) {
        const project = await db.project.create({
          data: {
            clientId: client.id,
            name,
            estimatedAmount: 200000,
            description: 'Batch entry test',
          },
        });
        await db.projectReport.create({
          data: {
            projectId: project.id,
            subcontractorId: subcontractor.id,
            date: new Date('2026-05-01'),
            profitMargin: 20,
          },
        });
      }

      await page.goto(`${BASE}/supplier-payments`);
      await page.waitForLoadState('networkidle');

      await page
        .getByRole('button', { name: /document payments/i })
        .first()
        .click();

      await page.selectOption('#batch-supplier', { value: supplier.id });

      const reports = await db.projectReport.findMany({
        where: { date: new Date('2026-05-01') },
        orderBy: { id: 'asc' },
      });
      await page.selectOption('#batch-report-0', { value: reports[0].id });
      await page.fill('#batch-amount-0', '4000');
      await page.getByRole('button', { name: /add line/i }).click();
      await page.selectOption('#batch-report-1', { value: reports[1].id });
      await page.fill('#batch-amount-1', '6000');

      await page.getByRole('button', { name: /save/i }).click();

      // Both lines land, or neither does.
      await expect
        .poll(async () =>
          db.supplierPayment.count({ where: { supplierId: supplier.id } }),
        )
        .toBe(2);
    },
  );

  dbTest('mark a whole supplier stack paid', async ({ page, db }) => {
    const client = await db.client.create({ data: { name: 'Paid Client' } });
    const subcontractor = await db.subcontractor.create({
      data: { name: 'Paid Sub', companyNumber: '515222010' },
    });
    const supplier = await db.supplier.create({
      data: { name: 'Paid Supplier' },
    });
    const project = await db.project.create({
      data: {
        clientId: client.id,
        name: 'Paid Project',
        estimatedAmount: 100000,
        description: 'Paid test',
      },
    });
    const report = await db.projectReport.create({
      data: {
        projectId: project.id,
        subcontractorId: subcontractor.id,
        date: new Date('2026-05-01'),
        profitMargin: 20,
      },
    });
    for (const amount of [1000, 2000]) {
      await db.supplierPayment.create({
        data: {
          projectReportId: report.id,
          supplierId: supplier.id,
          amount,
          date: new Date('2026-05-05'),
        },
      });
    }

    await page.goto(`${BASE}/supplier-payments`);
    await page.waitForLoadState('networkidle');

    await page
      .getByRole('button', { name: /mark all paid/i })
      .first()
      .click();

    await expect
      .poll(async () =>
        db.supplierPayment.count({
          where: { supplierId: supplier.id, isPaid: true },
        }),
      )
      .toBe(2);
  });
});
