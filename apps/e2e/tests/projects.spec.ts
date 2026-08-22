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
        },
      });
      const closedProject = await db.project.create({
        data: {
          clientId: client.id,
          name: 'Closed Project',
          estimatedAmount: 100000,
          description: 'Closed',
          isDone: true,
        },
      });
      await db.project.create({
        data: {
          clientId: client.id,
          name: 'Future Project',
          estimatedAmount: 100000,
          description: 'Future',
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
});
