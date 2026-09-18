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
