import type { Page } from '@playwright/test';
import { readFile } from 'fs/promises';
import { test as dbTest, expect } from '../fixtures/db.fixture';
import { expectValidPdf } from '../fixtures/pdf';

const BASE = 'http://localhost:5174';
const MONTH = '2026-05';
const SIMULATED_EXPORT_ROUTE =
  '**/api/v1/projects/reports/export-client-simulated-pdf';

/**
 * Supplier payments may run past a report's income — the subcontractor is
 * then owed a negative amount. That is allowed, but the user is asked first,
 * the income itself is optional (saved as 0), and such a project still
 * appears everywhere, the client-wide simulated PDF included.
 */
dbTest.describe('Payments above income', () => {
  async function seed(db: ReturnType<typeof Object>) {
    const client = await db.client.create({ data: { name: 'Thin Client' } });
    const subcontractor = await db.subcontractor.create({
      data: { name: 'Thin Worker', companyNumber: '515222031' },
    });
    const supplier = await db.supplier.create({
      data: { name: 'Thin Plumbing' },
    });
    const mkProject = (name: string) =>
      db.project.create({
        data: {
          clientId: client.id,
          name,
          estimatedAmount: 100000,
          description: `${name} description`,
          requesterName: 'Test Requester',
          location: 'Test Location',
        },
      });
    return { client, subcontractor, supplier, mkProject };
  }

  async function seedReport(
    db: ReturnType<typeof Object>,
    projectId: string,
    subcontractorId: string,
    income: number,
  ) {
    return db.projectReport.create({
      data: {
        projectId,
        subcontractorId,
        date: new Date(`${MONTH}-01`),
        profitMargin: 10,
        incomeEntries: { create: [{ amount: income }] },
      },
    });
  }

  async function addInlinePayment(page: Page, amount: string) {
    await page
      .getByRole('button', { name: /\+ Manpower \/ Supplier Payments/i })
      .click();
    await page
      .locator('select')
      .last()
      .selectOption({ label: 'Thin Plumbing' });
    await page.locator('input[type="number"]').last().fill(amount);
    await page.getByRole('button', { name: /^Add$/i }).last().click();
  }

  dbTest(
    'a report saved with no income is recorded with an income of 0',
    async ({ page, db }) => {
      const { subcontractor, mkProject } = await seed(db);
      const project = await mkProject('Zero Project');

      await page.goto(`${BASE}/reports/projects/${project.id}`);
      await page.waitForLoadState('networkidle');
      await page
        .getByRole('button', { name: /\+ Add/i })
        .first()
        .click();
      const modal = page.locator('.fixed.inset-0.z-50 > div');
      await modal
        .locator('select')
        .first()
        .selectOption({ label: 'Thin Worker' });
      await modal.locator('input[type="number"]').nth(0).fill('10');
      // Income left empty.
      await page.getByRole('button', { name: 'Save' }).click();

      await expect(modal).toHaveCount(0, { timeout: 8000 });
      const report = await db.projectReport.findFirstOrThrow({
        where: { projectId: project.id },
        include: { incomeEntries: true },
      });
      expect(report.subcontractorId).toBe(subcontractor.id);
      expect(report.incomeEntries).toHaveLength(1);
      expect(Number(report.incomeEntries[0].amount)).toBe(0);
    },
  );

  dbTest(
    'adding a payment above the income asks first, and backing out saves nothing',
    async ({ page, db }) => {
      const { subcontractor, mkProject } = await seed(db);
      const project = await mkProject('Thin Project');
      const report = await seedReport(db, project.id, subcontractor.id, 1);

      await page.goto(`${BASE}/reports/projects/${project.id}`);
      await page.waitForLoadState('networkidle');
      await addInlinePayment(page, '5000');

      const warning = page.getByRole('dialog', {
        name: 'Payments exceed income',
      });
      await expect(warning).toBeVisible();
      await expect(warning).toContainText('Thin Project');
      await warning.getByRole('button', { name: 'Cancel' }).click();

      await expect(warning).toHaveCount(0);
      expect(
        await db.supplierPayment.count({
          where: { projectReportId: report.id },
        }),
      ).toBe(0);
    },
  );

  dbTest(
    'confirming saves the payment and the sheet shows the negative remainder',
    async ({ page, db }) => {
      const { subcontractor, mkProject } = await seed(db);
      const project = await mkProject('Thin Project');
      const report = await seedReport(db, project.id, subcontractor.id, 1);

      await page.goto(`${BASE}/reports/projects/${project.id}`);
      await page.waitForLoadState('networkidle');
      await addInlinePayment(page, '5000');
      await page
        .getByRole('dialog', { name: 'Payments exceed income' })
        .getByRole('button', { name: 'Save anyway' })
        .click();

      await expect(page.getByText(/− ₪5,000/)).toBeVisible({ timeout: 5000 });
      expect(
        await db.supplierPayment.count({
          where: { projectReportId: report.id },
        }),
      ).toBe(1);
    },
  );

  dbTest(
    'a payment within the income is added without asking',
    async ({ page, db }) => {
      const { subcontractor, mkProject } = await seed(db);
      const project = await mkProject('Thick Project');
      await seedReport(db, project.id, subcontractor.id, 50000);

      await page.goto(`${BASE}/reports/projects/${project.id}`);
      await page.waitForLoadState('networkidle');
      await addInlinePayment(page, '5000');

      await expect(page.getByText(/− ₪5,000/)).toBeVisible({ timeout: 5000 });
      await expect(
        page.getByRole('dialog', { name: 'Payments exceed income' }),
      ).toHaveCount(0);
    },
  );

  dbTest(
    'the simulated PDF exports a client whose project is negative, after a busy month',
    async ({ page, db }) => {
      const { client, subcontractor, supplier, mkProject } = await seed(db);
      // Ten other clients' reports first: the export once read only the
      // month's first page of ten, dropping later reports.
      for (let i = 1; i <= 10; i++) {
        const other = await db.client.create({ data: { name: `Other ${i}` } });
        const otherProject = await db.project.create({
          data: {
            clientId: other.id,
            name: `Other Project ${i}`,
            estimatedAmount: 1000,
            description: 'Busy month',
            requesterName: 'Test Requester',
            location: 'Test Location',
          },
        });
        await seedReport(db, otherProject.id, subcontractor.id, 1000);
      }
      const healthy = await mkProject('Healthy Project');
      await seedReport(db, healthy.id, subcontractor.id, 50000);
      const negative = await mkProject('Negative Project');
      const negativeReport = await seedReport(
        db,
        negative.id,
        subcontractor.id,
        1,
      );
      await db.supplierPayment.create({
        data: {
          projectReportId: negativeReport.id,
          supplierId: supplier.id,
          amount: 5000,
        },
      });

      await page.goto(`${BASE}/reports`);
      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: /Thin Client/ }).click();
      // Both sheets on screen, the negative one included.
      await expect(
        page.getByText('Healthy Project', { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText('Negative Project', { exact: true }),
      ).toBeVisible();

      await page.getByRole('button', { name: 'Profit Simulator' }).click();
      const [request, download] = await Promise.all([
        page.waitForRequest(SIMULATED_EXPORT_ROUTE),
        page.waitForEvent('download'),
        page.getByRole('button', { name: 'Export Simulation PDF' }).click(),
      ]);

      expect(request.postDataJSON()).toMatchObject({ clientId: client.id });
      const response = await request.response();
      expect(response?.status()).toBe(200);
      expectValidPdf(await readFile(await download.path()));
    },
  );
});
