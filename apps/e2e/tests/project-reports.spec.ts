import { test as dbTest, expect } from '../fixtures/db.fixture';

const BASE = 'http://localhost:5174';

async function seedBaseData(db: ReturnType<typeof Object>) {
  const client = await db.client.create({ data: { name: 'Reports Client' } });
  const project = await db.project.create({
    data: {
      clientId: client.id,
      name: 'Reports Project',
      estimatedAmount: 200000,
      finishDate: new Date('2027-12-31'),
      description: 'For e2e report tests',
    },
  });
  const subcontractor = await db.subcontractor.create({
    data: { name: 'Reports Sub' },
  });
  const corporation = await db.corporation.create({
    data: { name: 'Reports Corp' },
  });
  return { client, project, subcontractor, corporation };
}

dbTest.describe('Project Reports', () => {
  dbTest('create report → appears in reports page', async ({ page, db }) => {
    const { project, subcontractor } = await seedBaseData(db);
    void project;

    // Navigate to reports page with a specific month
    await page.goto(`${BASE}/reports`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /\+ add/i }).first().click();

    const modal = page.locator('.fixed.inset-0').last();
    await expect(modal).toBeVisible();

    // Select client, then project
    await page.getByLabel('Client').selectOption({ label: 'Reports Client' });
    await page.getByLabel('Project').selectOption({ label: 'Reports Project' });
    await page.getByLabel('Subcontractor').selectOption({ label: 'Reports Sub' });

    // Set income
    await page.getByLabel('Income (₪)').fill('50000');
    await page.getByLabel('Profit Margin %').fill('10');

    await page.getByRole('button', { name: /save/i }).click();

    // Report card should appear
    await expect(page.getByText('Reports Project')).toBeVisible({ timeout: 8000 });
    void subcontractor;
  });

  dbTest('previous month report prefills subcontractor', async ({ page, db }) => {
    const { client, project, subcontractor } = await seedBaseData(db);

    // Seed a previous month's report
    const prevMonth = new Date('2026-04-01');
    await db.projectReport.create({
      data: {
        projectId: project.id,
        subcontractorId: subcontractor.id,
        date: prevMonth,
        profitMargin: 15,
        income: 30000,
      },
    });
    void client;

    await page.goto(`${BASE}/reports`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /\+ add/i }).first().click();

    await page.getByLabel('Client').selectOption({ label: 'Reports Client' });
    await page.getByLabel('Project').selectOption({ label: 'Reports Project' });

    // Subcontractor should be prefilled from latest report
    const subValue = await page.getByLabel('Subcontractor').inputValue();
    expect(subValue).toBeTruthy();
  });

  dbTest('navigate to project detail from report card', async ({ page, db }) => {
    const { project, subcontractor } = await seedBaseData(db);

    await db.projectReport.create({
      data: {
        projectId: project.id,
        subcontractorId: subcontractor.id,
        date: new Date('2026-05-01'),
        profitMargin: 10,
        income: 20000,
        incomeDate: new Date('2026-05-15'),
      },
    });

    await page.goto(`${BASE}/reports`);
    await page.waitForLoadState('networkidle');

    await page.getByText('Reports Project').first().click();
    await page.waitForURL(`**/reports/projects/**`);
    await expect(page).toHaveURL(/\/reports\/projects\//);
  });
});
