import { test as dbTest, expect, type DbFixture } from '../fixtures/db.fixture';

const BASE = 'http://localhost:5174';

/**
 * A project can move between clients from a chosen month. History is frozen —
 * months before the transfer stay with the client that owned them then.
 */
dbTest.describe('Project transfer between clients', () => {
  /**
   * Builds a project owned by client A from the start, with a report in
   * February and another in March, then transfers it to client B from March.
   */
  async function seedTransferredProject(db: DbFixture['db']) {
    const clientA = await db.client.create({ data: { name: 'Client Alpha' } });
    const clientB = await db.client.create({ data: { name: 'Client Beta' } });
    const subcontractor = await db.subcontractor.create({
      data: { name: 'Transfer Sub', companyNumber: '123456789' },
    });

    const project = await db.project.create({
      data: {
        clientId: clientA.id,
        name: 'Transferred Tower',
        estimatedAmount: 500000,
        description: 'Changes hands mid-build',
        requesterName: 'Test Requester',
        location: 'Test Location',
      },
    });

    // The project belongs to A from the beginning of time.
    await db.projectClientAssignment.create({
      data: {
        projectId: project.id,
        clientId: clientA.id,
        effectiveFrom: new Date('1970-01-01'),
      },
    });

    for (const month of ['2026-02-01', '2026-03-01']) {
      const report = await db.projectReport.create({
        data: {
          projectId: project.id,
          subcontractorId: subcontractor.id,
          date: new Date(month),
          profitMargin: 20,
        },
      });
      await db.projectReportIncome.create({
        data: {
          projectReportId: report.id,
          amount: 100000,
          incomeDate: new Date(month),
        },
      });
    }

    return { clientA, clientB, project };
  }

  dbTest(
    'transfer a project → only later months move',
    async ({ page, db }) => {
      const { clientB, project } = await seedTransferredProject(db);

      await page.goto(`${BASE}/projects`);
      await page.waitForLoadState('networkidle');

      await page
        .getByRole('row', { name: /Transferred Tower/ })
        .getByTitle(/transfer to another client/i)
        .click();

      await page.selectOption('#transfer-client', { value: clientB.id });
      await page.fill('#transfer-month', '2026-03');
      await page.getByRole('button', { name: /save/i }).click();

      // The cached current client follows the latest assignment.
      await expect
        .poll(async () => {
          const row = await db.project.findUnique({
            where: { id: project.id },
          });
          return row?.clientId;
        })
        .toBe(clientB.id);

      // Two assignments now: the original, and the transfer from March.
      const assignments = await db.projectClientAssignment.findMany({
        where: { projectId: project.id },
        orderBy: { effectiveFrom: 'asc' },
      });
      expect(assignments).toHaveLength(2);
      expect(assignments[1].clientId).toBe(clientB.id);
    },
  );

  dbTest(
    'the month before a transfer still shows the old client',
    async ({ page, db }) => {
      const { clientA, clientB, project } = await seedTransferredProject(db);
      await db.projectClientAssignment.create({
        data: {
          projectId: project.id,
          clientId: clientB.id,
          effectiveFrom: new Date('2026-03-01'),
        },
      });
      await db.project.update({
        where: { id: project.id },
        data: { clientId: clientB.id },
      });

      // February is before the transfer — it belongs to Alpha, forever.
      await page.goto(`${BASE}/reports?month=2026-02`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByText(clientA.name)).toBeVisible({ timeout: 5000 });

      // March onward belongs to Beta.
      await page.goto(`${BASE}/reports?month=2026-03`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByText(clientB.name)).toBeVisible({ timeout: 5000 });
    },
  );

  dbTest(
    'deleting a client cannot destroy a project it no longer owns',
    async ({ page, db }) => {
      const { clientA, clientB, project } = await seedTransferredProject(db);
      await db.projectClientAssignment.create({
        data: {
          projectId: project.id,
          clientId: clientB.id,
          effectiveFrom: new Date('2026-03-01'),
        },
      });
      await db.project.update({
        where: { id: project.id },
        data: { clientId: clientB.id },
      });

      // Client Alpha still holds February's history. Removing it must be refused
      // rather than cascading through a project that is now Beta's.
      //
      // The API is called directly rather than through the UI so the refusal
      // itself is asserted. Auth is a JWT in localStorage, not a cookie, so it
      // has to be read out and attached by hand — without it the request would
      // 401 and this test would pass for entirely the wrong reason.
      await page.goto(`${BASE}/projects`);
      const token = await page.evaluate(() =>
        localStorage.getItem('beetbite.token'),
      );
      expect(token).toBeTruthy();

      const response = await page.request.delete(
        `http://localhost:3001/api/v1/clients/${clientA.id}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      // 409 Conflict — the client has related records, not merely unauthorised.
      expect(response.status()).toBe(409);

      const survivor = await db.project.findUnique({
        where: { id: project.id },
      });
      expect(survivor).not.toBeNull();
      const reports = await db.projectReport.findMany({
        where: { projectId: project.id },
      });
      expect(reports).toHaveLength(2);
    },
  );
});
