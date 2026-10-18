import { test as dbTest, expect } from '../fixtures/db.fixture';

const BASE = 'http://localhost:5174';

// The global month is pinned to 2026-05 by the db fixture, so all seeds use it.
dbTest.describe('Turnover summary (ריכוז מחזורי)', () => {
  dbTest(
    'shows per-client / per-project income and profit breakdown',
    async ({ page, db }) => {
      const client = await db.client.create({
        data: { name: 'Income Client' },
      });
      const subcontractor = await db.subcontractor.create({
        data: { name: 'Income Worker', companyNumber: '515222005' },
      });
      const project = await db.project.create({
        data: {
          clientId: client.id,
          name: 'Income Project',
          estimatedAmount: 300000,
          description: 'Monthly income test',
          requesterName: 'Test Requester',
          location: 'Test Location',
        },
      });
      await db.projectReport.create({
        data: {
          projectId: project.id,
          subcontractorId: subcontractor.id,
          date: new Date('2026-05-01'),
          profitMargin: 20,
          incomeEntries: {
            create: [{ amount: 50000, incomeDate: new Date('2026-05-15') }],
          },
        },
      });

      await page.goto(`${BASE}/income`);
      await page.waitForLoadState('networkidle');

      // Client card and its project row are rendered.
      await expect(
        page.getByRole('heading', { name: 'Income Client' }),
      ).toBeVisible();
      await expect(page.getByText('Income Project')).toBeVisible();

      // Income 50,000 and profit (20% = 10,000) appear.
      await expect(page.getByText(/50,000/).first()).toBeVisible();
      await expect(page.getByText(/10,000/).first()).toBeVisible();
    },
  );

  dbTest(
    'grand total sums every client for the month',
    async ({ page, db }) => {
      const sub = await db.subcontractor.create({
        data: { name: 'GT Worker', companyNumber: '515222006' },
      });
      for (const [name, amount] of [
        ['Client A', 40000],
        ['Client B', 60000],
      ] as const) {
        const client = await db.client.create({ data: { name } });
        const project = await db.project.create({
          data: {
            clientId: client.id,
            name: `${name} Project`,
            estimatedAmount: 500000,
            description: 'gt',
            requesterName: 'Test Requester',
            location: 'Test Location',
          },
        });
        await db.projectReport.create({
          data: {
            projectId: project.id,
            subcontractorId: sub.id,
            date: new Date('2026-05-01'),
            profitMargin: 10,
            incomeEntries: {
              create: [{ amount, incomeDate: new Date('2026-05-10') }],
            },
          },
        });
      }

      await page.goto(`${BASE}/income`);
      await page.waitForLoadState('networkidle');

      // Grand total income = 40,000 + 60,000 = 100,000.
      const grandTotalRow = page
        .locator('div', { hasText: 'Grand Total' })
        .last();
      await expect(grandTotalRow).toBeVisible();
      await expect(page.getByText(/100,000/).first()).toBeVisible();
    },
  );

  dbTest(
    'records partial payments with their dates until the month is paid',
    async ({ page, db }) => {
      const client = await db.client.create({ data: { name: 'Pay Client' } });
      const sub = await db.subcontractor.create({
        data: { name: 'Pay Worker', companyNumber: '515222007' },
      });
      const project = await db.project.create({
        data: {
          clientId: client.id,
          name: 'Pay Project',
          estimatedAmount: 300000,
          description: 'client payments',
          requesterName: 'Test Requester',
          location: 'Test Location',
        },
      });
      const report = await db.projectReport.create({
        data: {
          projectId: project.id,
          subcontractorId: sub.id,
          date: new Date('2026-05-01'),
          profitMargin: 10,
          incomeEntries: { create: [{ amount: 50000 }] },
        },
      });

      await page.goto(`${BASE}/income`);
      await page.waitForLoadState('networkidle');

      await expect(
        page.getByRole('button', { name: 'Unpaid — Pay Project' }),
      ).toHaveAttribute('aria-pressed', 'true');

      // A first, partial payment.
      await page.getByRole('button', { name: 'Partial — Pay Project' }).click();
      await page.getByLabel('Amount (₪) — Pay Project').fill('20000');
      await page.getByLabel('Payment date — Pay Project').fill('2026-05-12');
      await page.getByRole('button', { name: 'Save' }).click();

      await expect(
        page.getByRole('button', { name: 'Partial — Pay Project' }),
      ).toHaveAttribute('aria-pressed', 'true');
      const list = page.getByRole('list', { name: 'Payments — Pay Project' });
      await expect(list.getByRole('listitem')).toHaveCount(1);
      await expect(list).toContainText('12 May 2026');

      // More than what is left is refused by the server.
      await page.getByRole('button', { name: 'Partial — Pay Project' }).click();
      await page.getByLabel('Amount (₪) — Pay Project').fill('30001');
      await page.getByRole('button', { name: 'Save' }).click();
      await expect(
        page.getByText(/would exceed the amount owed/i),
      ).toBeVisible();
      await page.getByRole('button', { name: 'Cancel' }).click();

      // The ✓ fills in the 30,000 still owed.
      await page
        .getByRole('button', { name: 'Paid — Pay Project', exact: true })
        .click();
      await expect(page.getByLabel('Amount (₪) — Pay Project')).toHaveValue(
        '30000',
      );
      await page.getByLabel('Payment date — Pay Project').fill('2026-05-25');
      await page.getByRole('button', { name: 'Save' }).click();

      await expect(
        page.getByRole('button', { name: 'Paid — Pay Project', exact: true }),
      ).toHaveAttribute('aria-pressed', 'true');
      await expect(list.getByRole('listitem')).toHaveCount(2);

      const payments = await db.clientPayment.findMany({
        where: { projectReportId: report.id },
        orderBy: { paymentDate: 'asc' },
      });
      expect(
        payments.map(
          (p: { amount: unknown; paymentDate: Date }) =>
            `${Number(p.amount)}@${p.paymentDate.toISOString().slice(0, 10)}`,
        ),
      ).toEqual(['20000@2026-05-12', '30000@2026-05-25']);

      // ✕ takes the month back to unpaid.
      await page.getByRole('button', { name: 'Unpaid — Pay Project' }).click();
      await expect(list).toHaveCount(0);
      await expect
        .poll(() =>
          db.clientPayment.count({ where: { projectReportId: report.id } }),
        )
        .toBe(0);
    },
  );

  dbTest(
    'adds VAT on a ticked row and carries it in the total',
    async ({ page, db }) => {
      const client = await db.client.create({ data: { name: 'Vat Client' } });
      const sub = await db.subcontractor.create({
        data: { name: 'Vat Worker', companyNumber: '515222008' },
      });
      const project = await db.project.create({
        data: {
          clientId: client.id,
          name: 'Vat Project',
          estimatedAmount: 300000,
          description: 'income vat',
          requesterName: 'Test Requester',
          location: 'Test Location',
        },
      });
      const report = await db.projectReport.create({
        data: {
          projectId: project.id,
          subcontractorId: sub.id,
          date: new Date('2026-05-01'),
          profitMargin: 10,
          incomeEntries: { create: [{ amount: 10000 }] },
        },
      });
      const rate = await db.vatRate.findFirst({
        where: { effectiveMonth: { lte: new Date('2026-05-01') } },
        orderBy: { effectiveMonth: 'desc' },
      });
      const vat = (10000 * Number(rate.percentage)) / 100;
      const fmt = (n: number) => `₪${n.toLocaleString('en-US')}`;

      await page.goto(`${BASE}/income`);
      await page.waitForLoadState('networkidle');

      const row = page.getByRole('row', { name: /Vat Project/ });
      const box = page.getByRole('checkbox', {
        name: 'Include VAT — Vat Project',
      });
      await expect(box).not.toBeChecked();
      await expect(row).toContainText(fmt(10000));

      // The box shows the saved choice, so it ticks once the server has it.
      await box.click();
      await expect(box).toBeChecked();
      await expect(row).toContainText(fmt(vat));
      await expect(row).toContainText(fmt(10000 + vat));

      await expect
        .poll(
          async () =>
            (
              await db.projectReport.findUniqueOrThrow({
                where: { id: report.id },
              })
            ).incomeIncludesVat,
        )
        .toBe(true);
    },
  );

  dbTest(
    'shows who ordered each project and groups by them',
    async ({ page, db }) => {
      const sub = await db.subcontractor.create({
        data: { name: 'Req Worker', companyNumber: '515222009' },
      });
      for (const [clientName, projectName, requesterName] of [
        ['Req Client A', 'Req Project 1', 'Moshe'],
        ['Req Client B', 'Req Project 2', 'Moshe'],
        ['Req Client B', 'Req Project 3', 'Ruth'],
      ] as const) {
        const client =
          (await db.client.findFirst({ where: { name: clientName } })) ??
          (await db.client.create({ data: { name: clientName } }));
        const project = await db.project.create({
          data: {
            clientId: client.id,
            name: projectName,
            estimatedAmount: 100000,
            description: 'requester',
            requesterName,
            location: 'Test Location',
          },
        });
        await db.projectReport.create({
          data: {
            projectId: project.id,
            subcontractorId: sub.id,
            date: new Date('2026-05-01'),
            profitMargin: 10,
            incomeEntries: { create: [{ amount: 1000 }] },
          },
        });
      }

      await page.goto(`${BASE}/income`);
      await page.waitForLoadState('networkidle');

      await expect(
        page.getByRole('row', { name: /Req Project 3/ }),
      ).toContainText('Ruth');

      await page.getByRole('button', { name: 'Requester' }).click();
      const headings = page.getByRole('heading', { level: 2 });
      await expect(headings).toHaveText(['Moshe', 'Ruth']);
      await expect(
        page.getByRole('row', { name: /Req Project 1/ }),
      ).toContainText('Req Client A');
    },
  );

  dbTest(
    'shows an empty state when there is no income this month',
    async ({ page, db }) => {
      void db;
      await page.goto(`${BASE}/income`);
      await page.waitForLoadState('networkidle');

      await expect(
        page.getByText(/no income recorded this month/i),
      ).toBeVisible();
      await expect(page.getByText('Grand Total')).not.toBeVisible();
    },
  );
});
