import { test as dbTest, expect } from '../fixtures/db.fixture';

const BASE = 'http://localhost:5174';

dbTest.describe('Subcontractor Payments', () => {
  // The projects table keys its inputs by project id, so each test needs the
  // id the fixture just seeded.
  let projectId: string;

  dbTest.beforeEach(async ({ db }) => {
    const client = await db.client.create({ data: { name: 'SubPay Client' } });
    const subcontractor = await db.subcontractor.create({
      data: { name: 'SubPay Worker', companyNumber: '515222003' },
    });
    const project = await db.project.create({
      data: {
        clientId: client.id,
        name: 'SubPay Project',
        estimatedAmount: 200000,
        description: 'Subcontractor payment tests',
        requesterName: 'Test Requester',
        location: 'Test Location',
      },
    });
    projectId = project.id;
    // Create a project report for the current test month so the subcontractor appears
    await db.projectReport.create({
      data: {
        projectId: project.id,
        subcontractorId: subcontractor.id,
        date: new Date('2026-05-01'),
        profitMargin: 10,
        incomeEntries: {
          create: [{ amount: 50000, incomeDate: new Date('2026-05-15') }],
        },
      },
    });
  });

  /** Open the page and select the seeded subcontractor's card. */
  async function openWorkerPanel(page: import('@playwright/test').Page) {
    await page.goto(`${BASE}/subcontractor-payments`);
    await page.waitForLoadState('networkidle');
    await page.getByText('SubPay Worker').first().click();
  }

  /** Fill the inline partial row for the seeded project and save it. */
  async function payPartial(
    page: import('@playwright/test').Page,
    amount: string,
  ) {
    await page.getByTitle('Partial', { exact: true }).first().click();
    await page.fill(`#partial-${projectId}`, amount);
    await page.getByTitle('Save', { exact: true }).first().click();
  }

  dbTest(
    'add partial payment → total paid updates in subcontractor card',
    async ({ page, db }) => {
      void db;
      await openWorkerPanel(page);
      await payPartial(page, '10000');

      // The card's "Paid" line appears once a payment exists.
      await expect(page.getByText(/10,000|10000/).first()).toBeVisible({
        timeout: 5000,
      });
    },
  );

  dbTest(
    'overpay guard: payment exceeding amount owed is rejected',
    async ({ page, db }) => {
      void db;
      // Amount owed = income - (income × margin%) = 50000 - 5000 = 45000
      // Attempting to pay 50000 should exceed the owed amount
      await openWorkerPanel(page);
      await payPartial(page, '50000');

      // Backend rejects the overpayment (400) and the app surfaces the error in a
      // toast. Its presence is the proof of rejection (the toast auto-dismisses
      // after 3s, so assert it promptly).
      await expect(page.getByText(/would exceed amount owed/i)).toBeVisible({
        timeout: 5000,
      });

      // The card still shows the amount owed (45,000) and never records the payment.
      await expect(page.getByText(/₪45,000/).first()).toBeVisible();
    },
  );

  dbTest(
    'marking a project paid records the full amount owed',
    async ({ page, db }) => {
      void db;
      await openWorkerPanel(page);

      await page.getByTitle('Paid', { exact: true }).first().click();

      // Owed = 45000, and the whole owed amount is recorded as one payment.
      await expect(async () => {
        const payments = await db.subcontractorPayment.findMany();
        expect(payments).toHaveLength(1);
        expect(Number(payments[0].amount)).toBe(45000);
      }).toPass({ timeout: 5000 });
    },
  );

  dbTest(
    'two partial payments on different dates are each listed',
    async ({ page, db }) => {
      const client = await db.client.create({ data: { name: 'Dates Client' } });
      const subcontractor = await db.subcontractor.create({
        data: { name: 'Dates Sub', companyNumber: '515222020' },
      });
      const project = await db.project.create({
        data: {
          clientId: client.id,
          name: 'Dates Project',
          estimatedAmount: 100000,
          description: 'Payment date test',
          requesterName: 'Test Requester',
          location: 'Test Location',
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
      await db.projectReportIncome.create({
        data: {
          projectReportId: report.id,
          amount: 10000,
          incomeDate: new Date('2026-05-10'),
        },
      });

      // Two instalments settling the same month, paid on different days.
      for (const [amount, day] of [
        [3000, '2026-05-05'],
        [2000, '2026-05-19'],
      ] as const) {
        await db.subcontractorPayment.create({
          data: {
            subcontractorId: subcontractor.id,
            projectId: project.id,
            serviceDate: new Date('2026-05-01'),
            amount,
            paymentDate: new Date(day),
          },
        });
      }

      await page.goto(`${BASE}/subcontractor-payments`);
      await page.waitForLoadState('networkidle');
      await page.getByText('Dates Sub').click();

      // Each instalment shows its own day next to its own amount. Assert on
      // the pair within one list row: a bare amount lookup also matches the
      // balance and remaining lines, which can carry the same figure.
      for (const [day, amount] of [
        ['5 May 2026', '₪3,000'],
        ['19 May 2026', '₪2,000'],
      ] as const) {
        await expect(
          page.getByRole('listitem').filter({ hasText: day }),
        ).toContainText(amount, { timeout: 5000 });
      }

      // The month being settled is untouched by either day.
      const rows = await db.subcontractorPayment.findMany({
        where: { projectId: project.id },
      });
      for (const row of rows) {
        expect(row.serviceDate.toISOString().slice(0, 10)).toBe('2026-05-01');
      }
    },
  );
});
