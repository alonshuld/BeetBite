import { test as dbTest, expect } from '../fixtures/db.fixture';

const BASE = 'http://localhost:5174';

dbTest.describe('Subcontractor teams', () => {
  let bobId: string;
  let danaId: string;
  let towerReportId: string;
  let harbourProjectId: string;

  dbTest.beforeEach(async ({ db }) => {
    const client = await db.client.create({ data: { name: 'Team Client' } });
    bobId = (
      await db.subcontractor.create({
        data: { name: 'Bob Team', companyNumber: '515444001' },
      })
    ).id;
    danaId = (
      await db.subcontractor.create({
        data: { name: 'Dana Team', companyNumber: '515444002' },
      })
    ).id;

    const project = (name: string) =>
      db.project.create({
        data: {
          clientId: client.id,
          name,
          estimatedAmount: 200000,
          description: 'Team tests',
          requesterName: 'Requester',
          location: 'Location',
        },
      });
    const tower = await project('Team Tower');
    const harbour = await project('Team Harbour');
    harbourProjectId = harbour.id;

    // Owed: Tower 50,000 − 10% = 45,000 (Bob); Harbour 20,000 − 10% = 18,000 (Dana).
    towerReportId = (
      await db.projectReport.create({
        data: {
          projectId: tower.id,
          subcontractorId: bobId,
          date: new Date('2026-05-01'),
          profitMargin: 10,
          incomeEntries: { create: [{ amount: 50000 }] },
        },
      })
    ).id;
    await db.projectReport.create({
      data: {
        projectId: harbour.id,
        subcontractorId: danaId,
        date: new Date('2026-05-01'),
        profitMargin: 10,
        incomeEntries: { create: [{ amount: 20000 }] },
      },
    });
  });

  async function makeTeam(db: any) {
    await db.subcontractorTeam.create({
      data: { members: { connect: [{ id: bobId }, { id: danaId }] } },
    });
  }

  dbTest(
    'creates a team from the subcontractors page',
    async ({ page, db }) => {
      await page.goto(`${BASE}/subcontractors`);
      await page.getByRole('button', { name: 'Teams', exact: true }).click();
      await page.getByRole('button', { name: '+ New team' }).click();
      await page.getByLabel('Bob Team').check();
      await page.getByLabel('Dana Team').check();
      await page.getByRole('button', { name: 'Save', exact: true }).click();

      await expect(
        page.getByRole('dialog').getByText('Bob Team + Dana Team'),
      ).toBeVisible();
      await expect(async () => {
        const teams = await db.subcontractorTeam.findMany({
          include: { members: true },
        });
        expect(teams).toHaveLength(1);
        expect(
          teams[0].members.map((m: { id: string }) => m.id).sort(),
        ).toEqual([bobId, danaId].sort());
      }).toPass({ timeout: 5000 });
    },
  );

  dbTest(
    'shows a team as one card with totals per member',
    async ({ page, db }) => {
      await makeTeam(db);
      await page.goto(`${BASE}/subcontractor-payments`);
      await page.getByText('Bob Team + Dana Team').click();

      const footer = page.locator('tfoot');
      await expect(footer.getByRole('row').nth(0)).toContainText('Bob Team');
      await expect(footer.getByRole('row').nth(0)).toContainText('₪45,000');
      await expect(footer.getByRole('row').nth(1)).toContainText('Dana Team');
      await expect(footer.getByRole('row').nth(1)).toContainText('₪18,000');
      await expect(footer.getByRole('row').nth(2)).toContainText('₪63,000');
    },
  );

  dbTest(
    'hands a project to the other member, then pays that member',
    async ({ page, db }) => {
      await makeTeam(db);
      await page.goto(`${BASE}/subcontractor-payments`);
      await page.getByText('Bob Team + Dana Team').click();

      await page
        .getByLabel('Taken by — Team Harbour', { exact: true })
        .selectOption(bobId);

      await expect(async () => {
        const report = await db.projectReport.findFirst({
          where: { projectId: harbourProjectId },
        });
        expect(report.subcontractorId).toBe(bobId);
      }).toPass({ timeout: 5000 });

      const harbourRow = page.getByRole('row').filter({
        has: page.getByLabel('Taken by — Team Harbour', { exact: true }),
      });
      await harbourRow.getByTitle('Partial', { exact: true }).click();
      await page.fill(`#partial-${harbourProjectId}`, '1000');
      await page.getByTitle('Save', { exact: true }).first().click();

      await expect(async () => {
        const payments = await db.subcontractorPayment.findMany();
        expect(payments).toHaveLength(1);
        expect(payments[0].subcontractorId).toBe(bobId);
        expect(payments[0].projectId).toBe(harbourProjectId);
      }).toPass({ timeout: 5000 });

      // Paid to Bob now, so the member is locked for this month.
      await expect(
        page.getByLabel('Taken by — Team Harbour', { exact: true }),
      ).toBeDisabled();
    },
  );

  dbTest(
    'the server refuses to switch member once payments exist',
    async ({ page, db }) => {
      await makeTeam(db);
      const tower = await db.projectReport.findUnique({
        where: { id: towerReportId },
      });
      await db.subcontractorPayment.create({
        data: {
          subcontractorId: bobId,
          projectId: tower.projectId,
          serviceDate: new Date('2026-05-01'),
          amount: 1000,
        },
      });

      await page.goto(`${BASE}/subcontractor-payments`);
      const token = await page.evaluate(() =>
        localStorage.getItem('beetbite.token'),
      );
      const response = await page.request.patch(
        `${BASE}/api/v1/projects/reports/${towerReportId}/subcontractor`,
        {
          data: { subcontractorId: danaId },
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      expect(response.status()).toBe(409);
      expect((await response.json()).code).toBe(
        'PROJECT_REPORT_HAS_SUBCONTRACTOR_PAYMENTS',
      );
    },
  );
});
