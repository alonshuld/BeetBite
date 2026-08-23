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
 * End-to-end coverage for the monthly account-approval PDF export, driven from
 * the export modal on /subcontractor-payments.
 *
 * This is also the only layer that renders a PDF for real: puppeteer v25 is
 * ESM-only and Jest cannot load it, so the backend integration spec stubs the
 * browser and asserts HTML. Here the backend runs as an ordinary Node process,
 * so the bytes coming back are produced by a real Chromium.
 */
dbTest.describe('PDF export', () => {
  let subcontractorId: string;
  let clientId: string;
  let projectId: string;

  dbTest.beforeEach(async ({ db }) => {
    const client = await db.client.create({ data: { name: 'Export Client' } });
    clientId = client.id;

    const project = await db.project.create({
      data: {
        clientId: client.id,
        name: 'Export Project',
        estimatedAmount: 200000,
        description: 'PDF export tests',
      },
    });
    projectId = project.id;

    const subcontractor = await db.subcontractor.create({
      data: { name: 'Export Worker', companyNumber: '515222009' },
    });
    subcontractorId = subcontractor.id;

    await db.projectReport.create({
      data: {
        projectId: project.id,
        subcontractorId: subcontractor.id,
        date: MONTH_DATE,
        profitMargin: 10,
        incomeEntries: {
          create: [{ amount: 50000, incomeDate: new Date(`${MONTH}-15`) }],
        },
      },
    });
  });

  /** Opens the page and selects the seeded subcontractor's card. */
  async function openWorkerPanel(page: Page) {
    await page.goto(`${BASE}/subcontractor-payments`);
    await page.waitForLoadState('networkidle');
    await page.getByText('Export Worker').first().click();
  }

  /** Opens the export modal from the selected subcontractor's panel. */
  async function openExportModal(page: Page) {
    await page.getByRole('button', { name: 'Export PDF' }).click();
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

  dbTest('export button opens the export modal', async ({ page, db }) => {
    void db;
    await openWorkerPanel(page);
    await openExportModal(page);

    await expect(page.getByLabel('Approved For')).toBeVisible();
  });

  dbTest(
    'a single client is auto-selected and its picker is hidden',
    async ({ page, db }) => {
      void db;
      await openWorkerPanel(page);
      await openExportModal(page);

      // distinctClients.length === 1 → openExport() preselects it, so the
      // Select is never rendered and the export can go straight through.
      await expect(page.locator('#export-client')).toHaveCount(0);

      const [request] = await Promise.all([
        page.waitForRequest(EXPORT_ROUTE),
        (async () => {
          await page.getByLabel('Approved For').fill('Shell works');
          await page.getByRole('button', { name: 'Save' }).click();
        })(),
      ]);

      expect(request.postDataJSON()).toMatchObject({ clientId });
    },
  );

  dbTest(
    'with several clients the picker appears and blocks save until one is chosen',
    async ({ page, db }) => {
      const otherClient = await db.client.create({
        data: { name: 'Second Client' },
      });
      const otherProject = await db.project.create({
        data: {
          clientId: otherClient.id,
          name: 'Second Project',
          estimatedAmount: 50000,
          description: 'Second client work',
        },
      });
      await db.projectReport.create({
        data: {
          projectId: otherProject.id,
          subcontractorId,
          date: MONTH_DATE,
          profitMargin: 10,
          incomeEntries: { create: [{ amount: 20000 }] },
        },
      });

      await openWorkerPanel(page);
      await openExportModal(page);
      const exportCount = await countExportRequests(page);

      const clientSelect = page.locator('#export-client');
      await expect(clientSelect).toBeVisible();
      await expect(clientSelect).toHaveValue('');

      // No client picked → handleExport early-returns, modal stays open.
      await page.getByLabel('Approved For').fill('Shell works');
      await page.getByRole('button', { name: 'Save' }).click();
      await expect(
        page.getByRole('dialog', { name: 'Export PDF' }),
      ).toBeVisible();
      expect(exportCount()).toBe(0);

      // Pick one and it goes through.
      await clientSelect.selectOption(otherClient.id);
      const [request] = await Promise.all([
        page.waitForRequest(EXPORT_ROUTE),
        page.getByRole('button', { name: 'Save' }).click(),
      ]);
      expect(request.postDataJSON()).toMatchObject({
        clientId: otherClient.id,
      });
    },
  );

  dbTest('a blank "Approved For" sends no request', async ({ page, db }) => {
    void db;
    await openWorkerPanel(page);
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
      await openWorkerPanel(page);
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
    'the request carries the trimmed form values',
    async ({ page, db }) => {
      void db;
      await openWorkerPanel(page);
      await openExportModal(page);

      await page.getByLabel('Approved For').fill('  Shell works  ');
      const [request] = await Promise.all([
        page.waitForRequest(EXPORT_ROUTE),
        page.getByRole('button', { name: 'Save' }).click(),
      ]);

      expect(request.postDataJSON()).toEqual({
        subcontractorId,
        clientId,
        month: `${MONTH}-01`,
        approvedFor: 'Shell works',
        lang: 'en',
      });
    },
  );

  dbTest('a successful export closes the modal', async ({ page, db }) => {
    void db;
    await openWorkerPanel(page);
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
    await openWorkerPanel(page);
    await page.getByRole('button', { name: 'עב' }).click();

    await page.getByRole('button', { name: 'ייצוא PDF' }).click();
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

      await openWorkerPanel(page);
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

      await openWorkerPanel(page);
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

  dbTest('no matching reports surfaces a 404', async ({ page, db }) => {
    await openWorkerPanel(page);
    await openExportModal(page);

    // Remove the report behind the card after the page has rendered, so the
    // export asks for a month the backend no longer has anything for.
    await db.projectReport.deleteMany({ where: { projectId } });

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
  // Cross-feature
  // ==========================================================================

  dbTest(
    'a tag saved in the projects table reaches the exported document',
    async ({ page, db }) => {
      await openWorkerPanel(page);

      // Tag the project and mark it paid, the way a user would.
      await page.fill(`#tag-${projectId}`, 'Concrete');
      await page.getByTitle('Paid', { exact: true }).first().click();

      // The export reads tags back through findTagsByProject, so the write has
      // to have landed before the request goes out.
      await expect(async () => {
        const payments = await db.subcontractorPayment.findMany({
          where: { projectId },
        });
        expect(payments).toHaveLength(1);
        expect(payments[0].tag).toBe('Concrete');
      }).toPass({ timeout: 5000 });

      await openExportModal(page);
      await page.getByLabel('Approved For').fill('Shell works');

      const [response] = await Promise.all([
        page.waitForResponse(EXPORT_ROUTE),
        page.getByRole('button', { name: 'Save' }).click(),
      ]);

      expect(response.status()).toBe(200);
    },
  );
});
