import { test as dbTest, expect } from '../fixtures/db.fixture';

const BASE = 'http://localhost:5174';

// The global month is pinned to 2026-05 by the db fixture, so all seeds use it.
dbTest.describe('Monthly Income', () => {
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
    'shows each income as received or pending and edits its payment date in place',
    async ({ page, db }) => {
      const client = await db.client.create({ data: { name: 'Date Client' } });
      const sub = await db.subcontractor.create({
        data: { name: 'Date Worker', companyNumber: '515222007' },
      });
      const project = await db.project.create({
        data: {
          clientId: client.id,
          name: 'Date Project',
          estimatedAmount: 300000,
          description: 'income date edit',
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
          incomeEntries: {
            create: [
              { amount: 20000, incomeDate: null, tag: 'Frame' },
              { amount: 30000, incomeDate: new Date('2026-05-10') },
            ],
          },
        },
        include: { incomeEntries: true },
      });
      const pending = report.incomeEntries.find(
        (e: { tag: string | null }) => e.tag === 'Frame',
      )!;

      await page.goto(`${BASE}/income`);
      await page.waitForLoadState('networkidle');

      const frameRow = page.getByRole('row', { name: /Frame/ });
      await expect(frameRow.getByText('Pending')).toBeVisible();
      await expect(
        page.getByRole('row', { name: /Client Income/ }).getByText('Received'),
      ).toBeVisible();

      // Set the pending entry's payment date right here.
      const dateInput = page.getByLabel('Income Date – Date Project – Frame');
      await dateInput.fill('2026-05-20');
      await dateInput.press('Enter');
      await expect(frameRow.getByText('Received')).toBeVisible();

      const saved = await db.projectReportIncome.findUniqueOrThrow({
        where: { id: pending.id },
      });
      expect(saved.incomeDate?.toISOString().slice(0, 10)).toBe('2026-05-20');

      // Clearing the date marks it pending again.
      await page.getByLabel('Income Date – Date Project – Frame').fill('');
      await page.getByLabel('Income Date – Date Project – Frame').blur();
      await expect(frameRow.getByText('Pending')).toBeVisible();
      await expect
        .poll(
          async () =>
            (
              await db.projectReportIncome.findUniqueOrThrow({
                where: { id: pending.id },
              })
            ).incomeDate,
        )
        .toBeNull();
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
