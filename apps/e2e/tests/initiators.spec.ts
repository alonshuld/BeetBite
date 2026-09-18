import { readFile } from 'fs/promises';
import { test as dbTest, expect } from '../fixtures/db.fixture';
import { expectValidPdf } from '../fixtures/pdf';

const BASE = 'http://localhost:5174';

/** The month the fixture pins the global picker to. */
const MONTH = '2026-05';
const MONTH_DATE = new Date(`${MONTH}-01`);

/**
 * Initiator (יזם) — a documentation-only entity, added in T7. Payments
 * recorded against one are printed on the PDF but never enter any financial
 * calculation (see the invariant in project-reports.spec.ts and the backend's
 * own dedicated tests). This spec covers the CRUD page, linking an initiator
 * to a project, recording a payment on a report, and that the export pipeline
 * still succeeds with initiator data present.
 *
 * PDF content is deliberately not asserted by extracting text — see
 * `fixtures/pdf.ts` for why; the gating (no initiator → block absent, etc.) is
 * covered at the unit level in `pdf-export.service.spec.ts`.
 */
dbTest.describe('Initiators CRUD', () => {
  dbTest('create initiator → appears in list', async ({ page, db }) => {
    void db;
    await page.goto(`${BASE}/initiators`);
    await page.waitForLoadState('networkidle');

    // The empty state renders its own "+ Add Initiator" action alongside the
    // page header's, so two match — take the header's.
    await page
      .getByRole('button', { name: /add initiator/i })
      .first()
      .click();
    await page.fill('#initiator-name', 'Yaniv Goldman');
    await page.getByRole('button', { name: /save/i }).click();

    await expect(page.getByText('Yaniv Goldman')).toBeVisible({
      timeout: 5000,
    });
  });

  dbTest('edit initiator → changes reflected', async ({ page, db }) => {
    await db.initiator.create({ data: { name: 'Initiator To Edit' } });

    await page.goto(`${BASE}/initiators`);
    await page.waitForLoadState('networkidle');

    const row = page.getByRole('row', { name: /Initiator To Edit/ });
    await row.getByTitle(/edit/i).click();

    const modal = page.locator('[role="dialog"], .fixed.inset-0').last();
    await expect(modal).toBeVisible();
    await page.fill('#initiator-name', 'Initiator Renamed');
    await page.waitForTimeout(100);
    await page.getByRole('button', { name: /save/i }).click();

    await expect(page.getByText('Initiator Renamed')).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText('Initiator To Edit')).not.toBeVisible();
  });

  dbTest('delete initiator → removed from list', async ({ page, db }) => {
    await db.initiator.create({ data: { name: 'Initiator To Delete' } });

    await page.goto(`${BASE}/initiators`);
    await page.waitForLoadState('networkidle');

    const row = page.getByRole('row', { name: /Initiator To Delete/ });
    await row.getByTitle(/delete/i).click();
    await page
      .getByRole('button', { name: /delete/i })
      .last()
      .click();

    await expect(
      page.getByRole('cell', { name: 'Initiator To Delete' }),
    ).not.toBeVisible({ timeout: 5000 });
  });

  dbTest('duplicate name rejected', async ({ page, db }) => {
    await db.initiator.create({ data: { name: 'Unique Initiator' } });

    await page.goto(`${BASE}/initiators`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /add initiator/i }).click();
    await page.fill('#initiator-name', 'Unique Initiator');
    await page.getByRole('button', { name: /save/i }).click();

    // Save fails server-side; the form stays open rather than the row
    // silently duplicating.
    await expect(
      page.locator('[role="dialog"], .fixed.inset-0').last(),
    ).toBeVisible({ timeout: 3000 });
  });

  dbTest('search filters the list by name', async ({ page, db }) => {
    await db.initiator.createMany({
      data: [{ name: 'Yaniv Goldman' }, { name: 'Dana Cohen' }],
    });

    await page.goto(`${BASE}/initiators`);
    await page.waitForLoadState('networkidle');

    await page.getByPlaceholder(/search/i).fill('Yaniv');

    await expect(page.getByText('Yaniv Goldman')).toBeVisible();
    await expect(page.getByText('Dana Cohen')).not.toBeVisible();
  });
});

dbTest.describe('Initiator link and payments — documentation only', () => {
  let clientId: string;
  let subcontractorId: string;
  let projectId: string;
  let reportId: string;

  dbTest.beforeEach(async ({ db }) => {
    const client = await db.client.create({
      data: { name: 'Initiator Test Client' },
    });
    clientId = client.id;

    const subcontractor = await db.subcontractor.create({
      data: { name: 'Initiator Test Worker', companyNumber: '515333001' },
    });
    subcontractorId = subcontractor.id;

    const project = await db.project.create({
      data: {
        clientId,
        name: 'Initiator Test Project',
        estimatedAmount: 100000,
        description: 'Has an initiator by the time each test needs one',
        requesterName: 'Some Requester',
        location: 'Tel Aviv',
      },
    });
    projectId = project.id;

    const report = await db.projectReport.create({
      data: {
        projectId,
        subcontractorId,
        date: MONTH_DATE,
        profitMargin: 20,
        incomeEntries: {
          create: [{ amount: 40000, incomeDate: new Date(`${MONTH}-10`) }],
        },
      },
    });
    reportId = report.id;
  });

  dbTest(
    'linking an initiator to a project from the Projects page persists it',
    async ({ page, db }) => {
      const initiator = await db.initiator.create({
        data: { name: 'Project Initiator' },
      });

      await page.goto(`${BASE}/projects`);
      await page.waitForLoadState('networkidle');

      const row = page.getByText('Initiator Test Project').locator('../..');
      await row.getByTitle(/edit/i).click();

      const modal = page.locator('[role="dialog"], .fixed.inset-0').last();
      await expect(modal).toBeVisible();
      await page.selectOption('#proj-initiator', { value: initiator.id });
      await page.getByRole('button', { name: /save/i }).click();
      await expect(modal).toBeHidden({ timeout: 5000 });

      const updated = await db.project.findUnique({ where: { id: projectId } });
      expect(updated.initiatorId).toBe(initiator.id);
    },
  );

  dbTest(
    'recording an initiator payment on a report does not move the subcontractor remainder',
    async ({ page, db }) => {
      const initiator = await db.initiator.create({
        data: { name: 'Payment Initiator' },
      });
      await db.project.update({
        where: { id: projectId },
        data: { initiatorId: initiator.id },
      });

      await page.goto(`${BASE}/reports/projects/${projectId}`);
      await page.waitForLoadState('networkidle');

      // subcontractorPayment = income − profit − supplierPayments, unaffected
      // by anything recorded against the initiator (see project CLAUDE.md).
      const remainderBefore = await page
        .locator('span.text-success.font-bold.text-lg')
        .textContent();

      await page.getByRole('button', { name: '+ Initiator Payments' }).click();

      const selects = page.getByRole('combobox');
      await selects.last().selectOption(initiator.id);
      const amountInputs = page.getByLabel('Amount (₪)');
      await amountInputs.last().fill('5000');
      // Exact match — a non-exact "Add" also substring-matches the page's
      // unrelated "+ Add Income" button.
      await page.getByRole('button', { name: 'Add', exact: true }).click();

      await expect(page.getByText('₪5,000')).toBeVisible({ timeout: 5000 });

      const remainderAfter = await page
        .locator('span.text-success.font-bold.text-lg')
        .textContent();
      expect(remainderAfter).toBe(remainderBefore);

      const payments = await db.initiatorPayment.findMany({
        where: { projectReportId: reportId },
      });
      expect(payments).toHaveLength(1);
      expect(Number(payments[0].amount)).toBe(5000);
    },
  );

  dbTest(
    'exporting a report with an initiator payment still produces a valid PDF',
    async ({ page, db }) => {
      const initiator = await db.initiator.create({
        data: { name: 'Export Initiator' },
      });
      await db.project.update({
        where: { id: projectId },
        data: { initiatorId: initiator.id },
      });
      await db.initiatorPayment.create({
        data: {
          projectReportId: reportId,
          initiatorId: initiator.id,
          amount: 5000,
          description: 'Land acquisition',
        },
      });

      await page.goto(`${BASE}/reports`);
      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: /Initiator Test Client/ }).click();
      await page.getByRole('button', { name: 'Export PDF' }).first().click();
      await expect(
        page.getByRole('dialog', { name: 'Export PDF' }),
      ).toBeVisible();

      await page.getByLabel('Approved For').fill('Initiator export test');
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('button', { name: 'Save' }).click(),
      ]);

      const bytes = await readFile(await download.path());
      expectValidPdf(bytes);
    },
  );
});
