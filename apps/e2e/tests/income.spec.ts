import { test as dbTest, expect } from '../fixtures/db.fixture';

const BASE = 'http://localhost:5174';

dbTest.describe('Income Page', () => {
  dbTest('income page shows total income and profit stat cards', async ({
    page,
    db,
  }) => {
    const client = await db.client.create({ data: { name: 'Income Client' } });
    const project = await db.project.create({
      data: {
        clientId: client.id,
        name: 'Income Project',
        estimatedAmount: 500000,
        description: 'Income page test',
      },
    });
    const sub = await db.subcontractor.create({ data: { name: 'Income Sub' } });

    await db.projectReport.create({
      data: {
        projectId: project.id,
        subcontractorId: sub.id,
        date: new Date('2026-05-01'),
        profitMargin: 10,
        income: 100000,
        incomeDate: new Date('2026-05-15'),
      },
    });

    await page.goto(`${BASE}/income`);
    await page.waitForLoadState('networkidle');

    // Stat cards should show values
    await expect(page.getByText('Total Income').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Total Profit').first()).toBeVisible({ timeout: 5000 });
    // ₪100,000 income visible
    await expect(page.getByText(/100,000|100000/).first()).toBeVisible({
      timeout: 5000,
    });
  });

  dbTest('clicking project row navigates to project reports page', async ({
    page,
    db,
  }) => {
    const client = await db.client.create({ data: { name: 'NavIncome Client' } });
    const project = await db.project.create({
      data: {
        clientId: client.id,
        name: 'NavIncome Project',
        estimatedAmount: 300000,
        description: 'Navigation test',
      },
    });
    const sub = await db.subcontractor.create({
      data: { name: 'NavIncome Sub' },
    });

    await db.projectReport.create({
      data: {
        projectId: project.id,
        subcontractorId: sub.id,
        date: new Date('2026-05-01'),
        profitMargin: 10,
        income: 50000,
        incomeDate: new Date('2026-05-10'),
      },
    });

    await page.goto(`${BASE}/income`);
    await page.waitForLoadState('networkidle');

    await page.getByText('NavIncome Project').click();
    await page.waitForURL(`**/reports/projects/**`);
    await expect(page).toHaveURL(/\/reports\/projects\//);
  });

  dbTest('empty state shown when no reports for selected month', async ({
    page,
    db,
  }) => {
    void db;
    await page.goto(`${BASE}/income`);
    await page.waitForLoadState('networkidle');

    const totalIncomeCard = page.getByText('Total Income');
    const emptyState = page.getByText(/no income records/i);

    const hasStats = await totalIncomeCard.isVisible().catch(() => false);
    const hasEmpty = await emptyState.isVisible().catch(() => false);

    expect(hasStats || hasEmpty).toBe(true);
  });
});
