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
        requesterName: 'Test Requester',
        location: 'Test Location',
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
          requesterName: 'Test Requester',
          location: 'Test Location',
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
    'lists every client in a month with more than ten reports',
    async ({ page, db }) => {
      // The list request once sent no limit and got the API's default page
      // of 10, silently hiding the rest of a busy month.
      const sub = await db.subcontractor.create({
        data: { name: 'Busy Worker', companyNumber: '515222099' },
      });
      for (let i = 1; i <= 11; i++) {
        const name = `Busy Client ${String(i).padStart(2, '0')}`;
        const client = await db.client.create({ data: { name } });
        const project = await db.project.create({
          data: {
            clientId: client.id,
            name: `${name} Project`,
            estimatedAmount: 1000,
            description: 'Busy month',
            requesterName: 'Test Requester',
            location: 'Test Location',
          },
        });
        await db.projectReport.create({
          data: {
            projectId: project.id,
            subcontractorId: sub.id,
            date: new Date(`${MONTH}-01`),
            profitMargin: 10,
            incomeEntries: { create: [{ amount: 1000 }] },
          },
        });
      }

      await page.goto(`${BASE}/reports`);
      await page.waitForLoadState('networkidle');

      // 12 reports in the month: the Grid Client's plus eleven more.
      await expect(page.getByText('Grid Client')).toBeVisible();
      for (let i = 1; i <= 11; i++) {
        await expect(
          page.getByText(`Busy Client ${String(i).padStart(2, '0')}`, {
            exact: true,
          }),
        ).toBeVisible();
      }
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
      // The project name also appears in the client-wide simulator's
      // per-project row — scope to the sheet's own clickable header.
      await expect(
        page.getByRole('button', { name: 'Grid Project' }),
      ).toBeVisible();
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
    'the master slider previews every project without writing',
    async ({ page, db }) => {
      await openClient(page);

      let writes = 0;
      await page.route('**/api/v1/**', async (route) => {
        const method = route.request().method();
        if (method !== 'GET') writes += 1;
        await route.fallback();
      });

      // Closed by default — the bookmark tab on the far edge opens it.
      await page.getByRole('button', { name: 'Profit Simulator' }).click();
      await page.getByRole('slider', { name: 'All projects' }).fill('15');

      // 40,000 × 15% = 6,000 profit, leaving 34,000 for the subcontractor.
      // Shown on the simulator rail and, since T-sim, on the sheet itself.
      await expect(page.getByText('₪6,000').first()).toBeVisible();
      await expect(page.getByText('₪34,000').first()).toBeVisible();
      await expect(page.getByText('Profit (15%)')).toBeVisible();

      expect(writes).toBe(0);
      const reports = await db.projectReport.findMany();
      expect(Number(reports[0].profitMargin)).toBe(10);
    },
  );

  dbTest(
    "a project's own slider marks that sheet as simulated",
    async ({ page, db }) => {
      void db;
      await openClient(page);

      await page.getByRole('button', { name: 'Profit Simulator' }).click();
      // 50% is past the slider's 0–20 range, so it goes in via the number box.
      await page.getByRole('spinbutton', { name: 'Grid Project %' }).fill('50');

      await expect(page.getByText('Simulated').first()).toBeVisible();
      await expect(page.getByText('Profit (50%)')).toBeVisible();
      // The saved margin stays on the sheet as the reference it replaced.
      await expect(page.getByText(/Saved margin:\s*10%/).first()).toBeVisible();
    },
  );

  dbTest(
    'closing the simulator drops back to the stored figures',
    async ({ page, db }) => {
      void db;
      await openClient(page);

      await page.getByRole('button', { name: 'Profit Simulator' }).click();
      await page.getByRole('slider', { name: 'All projects' }).fill('18');
      await expect(page.getByText('Profit (18%)')).toBeVisible();

      // The handle stays on screen while open and closes the drawer.
      await page.getByRole('button', { name: 'Profit Simulator' }).click();

      await expect(page.getByText('Simulated')).toHaveCount(0);
      // Stored margin is 10%: 40,000 × 10% = 4,000.
      await expect(page.getByText('Profit (10%)')).toBeVisible();
      await expect(page.getByText('₪4,000').first()).toBeVisible();
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

      // 40,000 income − 10% profit − no supplier payments. The same figure
      // also appears on the project sheet, so scope to the header total. The
      // header renders the caption and the amount as two sibling spans, so the
      // assertion has to run against the pair's wrapper — the caption element
      // itself holds no digits.
      const headerTotal = page
        .getByText('Total Sub Payments', { exact: true })
        .locator('..');
      await expect(headerTotal).toContainText('36,000');
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
          requesterName: 'Test Requester',
          location: 'Test Location',
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
