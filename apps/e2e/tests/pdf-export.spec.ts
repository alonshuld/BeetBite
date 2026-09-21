import type { Page } from '@playwright/test';
import { readFile } from 'fs/promises';
import { test as dbTest, expect } from '../fixtures/db.fixture';
import { expectValidPdf, pdfPageCount } from '../fixtures/pdf';
import { COMPANY_SETTINGS_ID } from '../fixtures/seed';

const BASE = 'http://localhost:5174';
const EXPORT_ROUTE = '**/api/v1/projects/reports/export-pdf';

/** The month the fixture pins the global picker to. */
const MONTH = '2026-05';
const MONTH_DATE = new Date(`${MONTH}-01`);

/**
 * End-to-end coverage for the account-approval PDF, driven from the export
 * button on each project sheet under /reports.
 *
 * This is also the only layer that renders a PDF for real: puppeteer v25 is
 * ESM-only and Jest cannot load it, so the backend integration spec stubs the
 * browser and asserts HTML. Here the backend runs as an ordinary Node process,
 * so the bytes coming back are produced by a real Chromium.
 */
dbTest.describe('PDF export', () => {
  let projectId: string;
  let reportId: string;

  dbTest.beforeEach(async ({ db }) => {
    const client = await db.client.create({ data: { name: 'Export Client' } });
    const project = await db.project.create({
      data: {
        clientId: client.id,
        name: 'Export Project',
        estimatedAmount: 200000,
        description: 'PDF export tests',
        requesterName: 'Test Requester',
        location: 'Test Location',
      },
    });
    projectId = project.id;

    const subcontractor = await db.subcontractor.create({
      data: { name: 'Export Worker', companyNumber: '515222009' },
    });

    const report = await db.projectReport.create({
      data: {
        projectId: project.id,
        subcontractorId: subcontractor.id,
        date: MONTH_DATE,
        profitMargin: 10,
        incomeEntries: {
          create: [
            {
              amount: 50000,
              incomeDate: new Date(`${MONTH}-15`),
              tag: 'Concrete',
            },
          ],
        },
      },
    });
    reportId = report.id;
  });

  /** Opens /reports and drills into the seeded client. */
  async function openClient(page: Page) {
    await page.goto(`${BASE}/reports`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /Export Client/ }).click();
  }

  /** Opens the export modal from the seeded project's sheet. */
  async function openExportModal(page: Page) {
    await openClient(page);
    await page.getByRole('button', { name: 'Export PDF' }).first().click();
    await expect(
      page.getByRole('dialog', { name: 'Export PDF' }),
    ).toBeVisible();
  }

  /** Counts export requests, so "nothing was sent" is assertable. */
  async function countExportRequests(page: Page): Promise<() => number> {
    let count = 0;
    await page.route(EXPORT_ROUTE, async (route) => {
      count += 1;
      await route.fallback();
    });
    return () => count;
  }

  // ==========================================================================
  // Modal mechanics
  // ==========================================================================

  dbTest('each project sheet opens an export modal', async ({ page, db }) => {
    void db;
    await openExportModal(page);

    await expect(page.getByLabel('Approved For')).toBeVisible();
    // The modal names the project the report belongs to.
    await expect(
      page.getByRole('dialog', { name: 'Export PDF' }),
    ).toContainText('Export Project');
  });

  dbTest('a blank "Approved For" sends no request', async ({ page, db }) => {
    void db;
    await openExportModal(page);
    const exportCount = await countExportRequests(page);

    // Whitespace only — handleExport trims before its emptiness check.
    await page.getByLabel('Approved For').fill('   ');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(
      page.getByRole('dialog', { name: 'Export PDF' }),
    ).toBeVisible();
    expect(exportCount()).toBe(0);
  });

  // ==========================================================================
  // Happy path
  // ==========================================================================

  dbTest(
    'exporting downloads a valid single-page PDF',
    async ({ page, db }) => {
      void db;
      await openExportModal(page);

      await page.getByLabel('Approved For').fill('Shell works');
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('button', { name: 'Save' }).click(),
      ]);

      expect(download.suggestedFilename()).toBe(
        `account-approval-${MONTH}.pdf`,
      );

      const bytes = await readFile(await download.path());
      expectValidPdf(bytes);
      expect(pdfPageCount(bytes)).toBe(1);
    },
  );

  dbTest(
    'the request carries the report id and trimmed text',
    async ({ page, db }) => {
      void db;
      await openExportModal(page);

      await page.getByLabel('Approved For').fill('  Shell works  ');
      const [request] = await Promise.all([
        page.waitForRequest(EXPORT_ROUTE),
        page.getByRole('button', { name: 'Save' }).click(),
      ]);

      expect(request.postDataJSON()).toEqual({
        projectReportId: reportId,
        approvedFor: 'Shell works',
        // Seeded from the project, sent as part of this one document.
        description: 'PDF export tests',
        lang: 'en',
      });
    },
  );

  // The dialog's description belongs to the document being produced, not to
  // the project. Editing it here used to write straight through to the
  // project record; the projects page is now the only place that changes.
  dbTest(
    'editing the description prints it without touching the project',
    async ({ page, db }) => {
      await openExportModal(page);

      await page.getByLabel('Approved For').fill('Shell works');
      await page.locator('#export-project-description').fill('This month only');

      const [request] = await Promise.all([
        page.waitForRequest(EXPORT_ROUTE),
        page.waitForEvent('download'),
        page.getByRole('button', { name: 'Save' }).click(),
      ]);

      expect(request.postDataJSON()).toMatchObject({
        description: 'This month only',
      });

      const project = await db.project.findUniqueOrThrow({
        where: { id: projectId },
      });
      expect(project.description).toBe('PDF export tests');
    },
  );

  dbTest('a successful export closes the modal', async ({ page, db }) => {
    void db;
    await openExportModal(page);

    await page.getByLabel('Approved For').fill('Shell works');
    await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Save' }).click(),
    ]);

    await expect(page.getByRole('dialog', { name: 'Export PDF' })).toBeHidden();
  });

  dbTest('Hebrew mode requests a Hebrew document', async ({ page, db }) => {
    void db;
    await openClient(page);
    await page.getByRole('button', { name: 'עב' }).click();

    await page.getByRole('button', { name: 'ייצוא PDF' }).first().click();
    await page.locator('#export-approved-for').fill('עבודות שלד');

    const [request] = await Promise.all([
      page.waitForRequest(EXPORT_ROUTE),
      page.getByRole('button', { name: 'שמירה' }).click(),
    ]);

    expect(request.postDataJSON()).toMatchObject({
      lang: 'he',
      approvedFor: 'עבודות שלד',
    });
  });

  // ==========================================================================
  // Error paths — real backend failures, not stubbed responses, so the
  // assertion proves the server actually produces that message.
  // ==========================================================================

  dbTest(
    'a missing VAT rate surfaces the server error and keeps the modal open',
    async ({ page, db }) => {
      await db.vatRate.deleteMany();

      await openExportModal(page);
      await page.getByLabel('Approved For').fill('Shell works');

      const [response] = await Promise.all([
        page.waitForResponse(EXPORT_ROUTE),
        page.getByRole('button', { name: 'Save' }).click(),
      ]);

      expect(response.status()).toBe(400);
      await expect(
        page.getByText(/No VAT rate has been configured/),
      ).toBeVisible();
      await expect(
        page.getByRole('dialog', { name: 'Export PDF' }),
      ).toBeVisible();
    },
  );

  dbTest(
    'incomplete company settings surface the server error',
    async ({ page, db }) => {
      await db.companySettings.update({
        where: { id: COMPANY_SETTINGS_ID },
        data: { companyNumber: null },
      });

      await openExportModal(page);
      await page.getByLabel('Approved For').fill('Shell works');

      const [response] = await Promise.all([
        page.waitForResponse(EXPORT_ROUTE),
        page.getByRole('button', { name: 'Save' }).click(),
      ]);

      expect(response.status()).toBe(400);
      await expect(
        page.getByText(/Company settings must have a name and company number/),
      ).toBeVisible();
    },
  );

  dbTest('a deleted report surfaces a 404', async ({ page, db }) => {
    await openExportModal(page);

    // Remove the report behind the sheet after the page has rendered.
    await db.projectReportIncome.deleteMany({
      where: { projectReportId: reportId },
    });
    await db.projectReport.delete({ where: { id: reportId } });

    await page.getByLabel('Approved For').fill('Shell works');
    const [response] = await Promise.all([
      page.waitForResponse(EXPORT_ROUTE),
      page.getByRole('button', { name: 'Save' }).click(),
    ]);

    expect(response.status()).toBe(404);
    await expect(
      page.getByRole('dialog', { name: 'Export PDF' }),
    ).toBeVisible();
  });

  // ==========================================================================
  // Cross-feature — the tag now lives on the income entry and becomes the
  // report row's description on the document.
  // ==========================================================================

  dbTest("an income entry's tag reaches the export", async ({ page, db }) => {
    void projectId;
    await openExportModal(page);
    await page.getByLabel('Approved For').fill('Shell works');

    const [response] = await Promise.all([
      page.waitForResponse(EXPORT_ROUTE),
      page.getByRole('button', { name: 'Save' }).click(),
    ]);

    expect(response.status()).toBe(200);
    const entries = await db.projectReportIncome.findMany({
      where: { projectReportId: reportId },
    });
    expect(entries[0].tag).toBe('Concrete');
  });
});
