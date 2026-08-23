import type { Page } from '@playwright/test';
import { test as dbTest, expect } from '../fixtures/db.fixture';

const BASE = 'http://localhost:5174';
const MONTH = '2026-05';

/**
 * Coverage for /reports — the client drill-down grid. Until now this page was
 * only ever *navigated to* (by the back button and the auth redirect); none of
 * its own behaviour was tested.
 */
dbTest.describe('Reports list', () => {
  let clientId: string;
  let projectId: string;

  dbTest.beforeEach(async ({ db }) => {
    const client = await db.client.create({ data: { name: 'Grid Client' } });
    clientId = client.id;
    const subcontractor = await db.subcontractor.create({
      data: { name: 'Grid Worker', companyNumber: '515222010' },
    });
    const project = await db.project.create({
      data: {
        clientId: client.id,
        name: 'Grid Project',
        estimatedAmount: 300000,
        description: 'Reports grid tests',
      },
    });
    projectId = project.id;

    await db.projectReport.create({
      data: {
        projectId: project.id,
        subcontractorId: subcontractor.id,
        date: new Date(`${MONTH}-01`),
        profitMargin: 10,
        incomeEntries: {
          create: [{ amount: 40000, incomeDate: new Date(`${MONTH}-20`) }],
        },
      },
    });
  });

  async function openClient(page: Page, name = 'Grid Client') {
    await page.goto(`${BASE}/reports`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: new RegExp(name) }).click();
  }

  dbTest(
    'lists a card per client with a report this month',
    async ({ page, db }) => {
      void db;
      await page.goto(`${BASE}/reports`);
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('Grid Client')).toBeVisible();
      await expect(page.getByText(/1 project reports/i)).toBeVisible();
    },
  );

  dbTest(
    'omits a client whose only report is in another month',
    async ({ page, db }) => {
      const quiet = await db.client.create({ data: { name: 'Quiet Client' } });
      const quietProject = await db.project.create({
        data: {
          clientId: quiet.id,
          name: 'Quiet Project',
          estimatedAmount: 1000,
          description: 'Different month',
        },
      });
      const sub = await db.subcontractor.create({
        data: { name: 'Quiet Worker', companyNumber: '515222011' },
      });
      await db.projectReport.create({
        data: {
          projectId: quietProject.id,
          subcontractorId: sub.id,
          date: new Date('2026-04-01'),
          profitMargin: 10,
          incomeEntries: { create: [{ amount: 5000 }] },
        },
      });

      await page.goto(`${BASE}/reports`);
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('Grid Client')).toBeVisible();
      await expect(page.getByText('Quiet Client')).toHaveCount(0);
    },
  );

  dbTest(
    'drilling into a client shows its project sheets',
    async ({ page, db }) => {
      void db;
      await openClient(page);

      await expect(
        page.getByRole('heading', { name: 'Grid Client' }),
      ).toBeVisible();
      await expect(page.getByText('Grid Project')).toBeVisible();
    },
  );

  dbTest(
    'shows the received date when income has landed',
    async ({ page, db }) => {
      void db;
      await openClient(page);

      await expect(page.getByText(/Received/)).toBeVisible();
    },
  );

  dbTest('shows pending when income has not landed', async ({ page, db }) => {
    await db.projectReportIncome.updateMany({
      where: {},
      data: { incomeDate: null },
    });

    await openClient(page);

    await expect(page.getByText(/Pending/)).toBeVisible();
  });

  dbTest(
    'a project sheet navigates to the project detail page',
    async ({ page, db }) => {
      void db;
      await openClient(page);
      await page.getByRole('button', { name: 'Grid Project' }).click();

      await expect(page).toHaveURL(
        new RegExp(`/reports/projects/${projectId}`),
      );
    },
  );

  dbTest('the back button returns to the client grid', async ({ page, db }) => {
    void db;
    await openClient(page);
    await page.getByRole('button', { name: /Clients/ }).click();

    await expect(page.getByText(/1 project reports/i)).toBeVisible();
  });

  dbTest(
    'the profit simulator previews without writing',
    async ({ page, db }) => {
      await openClient(page);

      let writes = 0;
      await page.route('**/api/v1/**', async (route) => {
        const method = route.request().method();
        if (method !== 'GET') writes += 1;
        await route.fallback();
      });

      await page.getByLabel('Profit Margin %').fill('25');

      // 40,000 × 25% = 10,000 profit, leaving 30,000 for the subcontractor.
      await expect(page.getByText('₪10,000')).toBeVisible();
      await expect(page.getByText('₪30,000')).toBeVisible();

      expect(writes).toBe(0);
      const reports = await db.projectReport.findMany();
      expect(Number(reports[0].profitMargin)).toBe(10);
    },
  );

  dbTest(
    'shows an empty state for a month with no reports',
    async ({ page, db }) => {
      void db;
      await page.goto(`${BASE}/reports?month=2026-09`);
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('Grid Client')).toHaveCount(0);
    },
  );

  dbTest(
    'totals the subcontractor payments for the client',
    async ({ page, db }) => {
      void db;
      await openClient(page);

      // 40,000 income − 10% profit − no corporation payments. The same figure
      // also appears on the project sheet, so scope to the header total.
      await expect(page.getByText(/Total Sub Payments:/)).toContainText(
        '36,000',
      );
    },
  );

  dbTest(
    'creating a report from this page adds it to the grid',
    async ({ page, db }) => {
      const newSub = await db.subcontractor.create({
        data: { name: 'New Worker', companyNumber: '515222012' },
      });
      const newProject = await db.project.create({
        data: {
          clientId,
          name: 'Second Grid Project',
          estimatedAmount: 90000,
          description: 'Created via modal',
        },
      });

      await openClient(page);
      await page.getByRole('button', { name: '+ Add' }).first().click();

      await page.selectOption('#report-client', clientId);
      await page.selectOption('#report-project', newProject.id);
      // The service only skips its previous-month lookup when BOTH the
      // subcontractor and the profit margin are supplied. This project has no
      // earlier report to inherit either from, so omitting one 404s.
      await page.selectOption('#report-subcontractor', newSub.id);
      await page.fill('#report-profit-margin', '10');
      // handleSave bails unless at least one income entry carries an amount.
      await page.getByLabel('Income (₪)').fill('12000');
      await page.getByRole('button', { name: 'Save' }).click();

      await expect(async () => {
        const reports = await db.projectReport.findMany({
          where: { projectId: newProject.id },
          include: { incomeEntries: true },
        });
        expect(reports).toHaveLength(1);
        expect(Number(reports[0].incomeEntries[0].amount)).toBe(12000);
      }).toPass({ timeout: 5000 });
    },
  );
});
