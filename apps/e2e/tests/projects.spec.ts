import { test as dbTest, expect } from '../fixtures/db.fixture';

const BASE = 'http://localhost:5174';

dbTest.describe('Projects CRUD', () => {
  dbTest.beforeEach(async ({ db }) => {
    await db.client.create({ data: { name: 'E2E Test Client' } });
  });

  dbTest('create project → appears in list', async ({ page, db }) => {
    const client = await db.client.findFirst({
      where: { name: 'E2E Test Client' },
    });

    await page.goto(`${BASE}/projects`);
    await page.waitForLoadState('networkidle');

    // Toggle Future filter to see future projects too
    await page.getByRole('button', { name: 'Future' }).click();
    await page
      .getByRole('button', { name: /add project/i })
      .first()
      .click();

    await page.fill('#proj-name', 'E2E Automation Project');
    await page.selectOption('#proj-client', { value: client.id });
    await page.fill('#proj-desc', 'Created by e2e test');
    await page.fill('#proj-amount', '100000');
    await page.fill('#proj-requester', 'E2E Requester');
    await page.fill('#proj-location', 'E2E Location');
    await page.getByRole('button', { name: /save/i }).click();

    await expect(page.getByText('E2E Automation Project')).toBeVisible({
      timeout: 5000,
    });
  });

  dbTest('edit project → changes reflected', async ({ page, db }) => {
    const client = await db.client.findFirst({
      where: { name: 'E2E Test Client' },
    });
    await db.project.create({
      data: {
        clientId: client.id,
        name: 'Project To Edit',
        estimatedAmount: 50000,
        description: 'Original',
        requesterName: 'Test Requester',
        location: 'Test Location',
      },
    });

    await page.goto(`${BASE}/projects`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Future' }).click();

    const row = page.getByText('Project To Edit').locator('../..');
    await row.getByTitle(/edit/i).click();

    const modal = page.locator('[role="dialog"], .fixed.inset-0').last();
    await expect(modal).toBeVisible();
    await page.fill('#proj-name', 'Project Renamed');
    await page.waitForTimeout(100);
    await page.getByRole('button', { name: /save/i }).click();

    await expect(page.getByText('Project Renamed')).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText('Project To Edit')).not.toBeVisible();
  });

  dbTest(
    'edit project → client is locked, and the reports screen keeps showing the same client',
    async ({ page, db }) => {
      // The reported bug: changing the client in the edit form moved the
      // project on this screen only, while its reports stayed under the old
      // client. The client now changes only through a transfer.
      const client = await db.client.findFirst({
        where: { name: 'E2E Test Client' },
      });
      await db.client.create({ data: { name: 'Other Client' } });
      const subcontractor = await db.subcontractor.create({
        data: { name: 'Lock Worker', companyNumber: '515333010' },
      });
      const project = await db.project.create({
        data: {
          clientId: client.id,
          name: 'Locked Client Project',
          estimatedAmount: 50000,
          description: 'Original',
          requesterName: 'Test Requester',
          location: 'Test Location',
          clientAssignments: {
            create: { clientId: client.id, effectiveFrom: new Date(0) },
          },
        },
      });
      await db.projectReport.create({
        data: {
          projectId: project.id,
          subcontractorId: subcontractor.id,
          date: new Date('2026-05-01'),
          profitMargin: 10,
          incomeEntries: { create: [{ amount: 1000 }] },
        },
      });

      await page.goto(`${BASE}/projects`);
      await page.waitForLoadState('networkidle');
      const row = page.getByText('Locked Client Project').locator('../..');
      await row.getByTitle(/edit/i).click();

      await expect(page.locator('#proj-client')).toBeDisabled();
      await expect(page.locator('#proj-client')).toHaveValue(client.id);
      await expect(
        page.getByText(/to change the client, use transfer/i),
      ).toBeVisible();

      await page.fill('#proj-desc', 'Edited with the client locked');
      await page.getByRole('button', { name: /save/i }).click();
      await expect(page.locator('#proj-client')).toBeHidden({
        timeout: 5000,
      });

      const saved = await db.project.findUnique({
        where: { id: project.id },
        include: { clientAssignments: true },
      });
      expect(saved.description).toBe('Edited with the client locked');
      expect(saved.clientId).toBe(client.id);
      expect(
        saved.clientAssignments.map((a: { clientId: string }) => a.clientId),
      ).toEqual([client.id]);

      await page.goto(`${BASE}/reports`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByText('Other Client')).toHaveCount(0);
      await page.getByRole('button', { name: /E2E Test Client/ }).click();
      await expect(page.getByText('Locked Client Project')).toBeVisible();
    },
  );

  dbTest('delete project → removed from list', async ({ page, db }) => {
    const client = await db.client.findFirst({
      where: { name: 'E2E Test Client' },
    });
    await db.project.create({
      data: {
        clientId: client.id,
        name: 'Project To Delete',
        estimatedAmount: 50000,
        description: 'For deletion',
        requesterName: 'Test Requester',
        location: 'Test Location',
      },
    });

    await page.goto(`${BASE}/projects`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Future' }).click();

    const row = page.getByText('Project To Delete').locator('../..');
    await row.getByTitle(/delete/i).click();
    await page
      .getByRole('button', { name: /delete/i })
      .last()
      .click();

    await expect(
      page.getByRole('cell', { name: 'Project To Delete' }),
    ).not.toBeVisible({
      timeout: 5000,
    });
  });

  dbTest(
    'Active/Future/Closed filter toggles show correct subsets',
    async ({ page, db }) => {
      const client = await db.client.findFirst({
        where: { name: 'E2E Test Client' },
      });
      const subcontractor = await db.subcontractor.create({
        data: { name: 'E2E Sub', companyNumber: '515222002' },
      });

      const activeProject = await db.project.create({
        data: {
          clientId: client.id,
          name: 'Active Project',
          estimatedAmount: 100000,
          description: 'Active',
          requesterName: 'Test Requester',
          location: 'Test Location',
        },
      });
      const closedProject = await db.project.create({
        data: {
          clientId: client.id,
          name: 'Closed Project',
          estimatedAmount: 100000,
          description: 'Closed',
          isDone: true,
          requesterName: 'Test Requester',
          location: 'Test Location',
        },
      });
      await db.project.create({
        data: {
          clientId: client.id,
          name: 'Future Project',
          estimatedAmount: 100000,
          description: 'Future',
          requesterName: 'Test Requester',
          location: 'Test Location',
        },
      });

      // Add a report to make activeProject truly "active"
      await db.projectReport.create({
        data: {
          projectId: activeProject.id,
          subcontractorId: subcontractor.id,
          date: new Date('2026-01-01'),
          profitMargin: 10,
          incomeEntries: { create: [{ amount: 10000 }] },
        },
      });

      await page.goto(`${BASE}/projects`);
      await page.waitForLoadState('networkidle');

      // Default: only Active shown
      await expect(page.getByText('Active Project')).toBeVisible();
      await expect(page.getByText('Closed Project')).not.toBeVisible();
      await expect(page.getByText('Future Project')).not.toBeVisible();

      // Toggle Closed on
      await page.getByRole('button', { name: 'Closed' }).click();
      await expect(page.getByText('Closed Project')).toBeVisible();

      // Toggle Future on
      await page.getByRole('button', { name: 'Future' }).click();
      await expect(page.getByText('Future Project')).toBeVisible();

      void closedProject;
    },
  );

  dbTest('duplicate project name rejected', async ({ page, db }) => {
    const client = await db.client.findFirst({
      where: { name: 'E2E Test Client' },
    });
    await db.project.create({
      data: {
        clientId: client.id,
        name: 'Taken Name',
        estimatedAmount: 1000,
        description: 'Already here',
        requesterName: 'Test Requester',
        location: 'Test Location',
      },
    });

    await page.goto(`${BASE}/projects`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Future' }).click();
    await page
      .getByRole('button', { name: /add project/i })
      .first()
      .click();

    await page.fill('#proj-name', 'Taken Name');
    await page.selectOption('#proj-client', { value: client.id });
    await page.fill('#proj-desc', 'Duplicate attempt');
    await page.fill('#proj-amount', '5000');
    await page.fill('#proj-requester', 'E2E Requester');
    await page.fill('#proj-location', 'E2E Location');
    await page.getByRole('button', { name: /save/i }).click();

    await expect(page.getByText(/already exists/i)).toBeVisible({
      timeout: 5000,
    });
    expect(await db.project.findMany()).toHaveLength(1);
  });

  dbTest('isDone toggle persists immediately', async ({ page, db }) => {
    const client = await db.client.findFirst({
      where: { name: 'E2E Test Client' },
    });
    const project = await db.project.create({
      data: {
        clientId: client.id,
        name: 'Toggle Project',
        estimatedAmount: 1000,
        description: 'Toggle test',
        requesterName: 'Test Requester',
        location: 'Test Location',
      },
    });

    await page.goto(`${BASE}/projects`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Future' }).click();

    // The Toggle atom hides the real checkbox (`sr-only`) behind the visible
    // track, so clicking the input directly is intercepted — click its label,
    // which is what a user actually hits.
    await page.locator(`label[for="done-${project.id}"]`).click();

    await expect(async () => {
      const updated = await db.project.findUnique({
        where: { id: project.id },
      });
      expect(updated.isDone).toBe(true);
    }).toPass({ timeout: 5000 });
  });

  // A project entered part-way through the work carries money that has
  // already come in. It is recorded as a real back-dated report, so these
  // assert the report exists and behaves like any hand-made one.
  dbTest.describe('opening balance', () => {
    dbTest(
      'create project with an opening balance → its month has a report',
      async ({ page, db }) => {
        const client = await db.client.findFirst({
          where: { name: 'E2E Test Client' },
        });
        const subcontractor = await db.subcontractor.create({
          data: { name: 'Opening Sub', companyNumber: '515333030' },
        });

        await page.goto(`${BASE}/projects`);
        await page.waitForLoadState('networkidle');
        await page.getByRole('button', { name: 'Future' }).click();
        await page
          .getByRole('button', { name: /add project/i })
          .first()
          .click();

        await page.fill('#proj-name', 'Mid-Build Project');
        await page.selectOption('#proj-client', { value: client.id });
        await page.fill('#proj-desc', 'Entered part-way through');
        await page.fill('#proj-amount', '200000');
        await page.fill('#proj-requester', 'E2E Requester');
        await page.fill('#proj-location', 'E2E Location');

        // The section is collapsed by default; it only exists for importing
        // pre-BeetBite data.
        await page.getByRole('button', { name: /already received/i }).click();
        await page.fill('#proj-opening-amount', '45000');
        await page.fill('#proj-opening-month', '2026-04');
        await page.selectOption('#proj-opening-subcontractor', {
          value: subcontractor.id,
        });
        await page.fill('#proj-opening-margin', '12.5');
        await page.getByRole('button', { name: /save/i }).click();

        await expect(page.getByText('Mid-Build Project')).toBeVisible({
          timeout: 5000,
        });

        const project = await db.project.findFirst({
          where: { name: 'Mid-Build Project' },
        });
        const reports = await db.projectReport.findMany({
          where: { projectId: project.id },
          include: { incomeEntries: true },
        });

        expect(reports).toHaveLength(1);
        expect(reports[0].date.toISOString().slice(0, 10)).toBe('2026-04-01');
        expect(reports[0].subcontractorId).toBe(subcontractor.id);
        expect(reports[0].incomeEntries).toHaveLength(1);
        expect(Number(reports[0].incomeEntries[0].amount)).toBe(45000);
        expect(reports[0].incomeEntries[0].tag).toBe('Opening balance');

        // "Already received" means the money is in hand. A null incomeDate
        // would file it as still owed and keep it out of payment progress,
        // which is the one figure the opening balance exists to correct.
        expect(reports[0].incomeEntries[0].incomeDate).not.toBeNull();

        // Payment progress counts client payments, so the amount is one too.
        const payments = await db.clientPayment.findMany({
          where: { projectReportId: reports[0].id },
        });
        expect(
          payments.map((p: { amount: unknown }) => Number(p.amount)),
        ).toEqual([45000]);
      },
    );

    dbTest(
      'leaving the section empty creates no report',
      async ({ page, db }) => {
        const client = await db.client.findFirst({
          where: { name: 'E2E Test Client' },
        });

        await page.goto(`${BASE}/projects`);
        await page.waitForLoadState('networkidle');
        await page.getByRole('button', { name: 'Future' }).click();
        await page
          .getByRole('button', { name: /add project/i })
          .first()
          .click();

        await page.fill('#proj-name', 'Plain Project');
        await page.selectOption('#proj-client', { value: client.id });
        await page.fill('#proj-desc', 'No opening balance');
        await page.fill('#proj-amount', '50000');
        await page.fill('#proj-requester', 'E2E Requester');
        await page.fill('#proj-location', 'E2E Location');
        await page.getByRole('button', { name: /save/i }).click();

        await expect(page.getByText('Plain Project')).toBeVisible({
          timeout: 5000,
        });

        const project = await db.project.findFirst({
          where: { name: 'Plain Project' },
        });
        const reports = await db.projectReport.findMany({
          where: { projectId: project.id },
        });
        expect(reports).toHaveLength(0);
      },
    );

    // 🔴 Atomicity, against a real database — the one place it can actually be
    // proven. A bad subcontractor fails the report write partway through the
    // transaction; the project must not survive it. The API is called directly
    // because the UI cannot produce this state.
    dbTest('a failed report leaves no project behind', async ({ page, db }) => {
      const client = await db.client.findFirst({
        where: { name: 'E2E Test Client' },
      });

      await page.goto(`${BASE}/projects`);
      const token = await page.evaluate(() =>
        localStorage.getItem('beetbite.token'),
      );
      expect(token).toBeTruthy();

      const response = await page.request.post(
        'http://localhost:3001/api/v1/projects',
        {
          headers: { Authorization: `Bearer ${token}` },
          data: {
            clientId: client.id,
            name: 'Doomed Project',
            description: 'Should never exist',
            estimatedAmount: 10000,
            requesterName: 'E2E Requester',
            location: 'E2E Location',
            openingBalance: {
              amount: 45000,
              month: '2026-04-01',
              subcontractorId: 'no-such-subcontractor',
              profitMargin: 10,
            },
          },
        },
      );

      // 404, naming the subcontractor — not the client, which is valid here.
      expect(response.status()).toBe(404);
      expect(await response.text()).toContain('ubcontractor');

      expect(
        await db.project.findMany({ where: { name: 'Doomed Project' } }),
      ).toHaveLength(0);
      expect(await db.projectReport.findMany()).toHaveLength(0);
    });
  });
});
