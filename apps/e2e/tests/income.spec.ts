import { test as dbTest, expect } from '../fixtures/db.fixture';

const BASE = 'http://localhost:5174';

// The global month is pinned to 2026-05 by the db fixture, so all seeds use it.
dbTest.describe('Turnover summary (ריכוז מחזורי)', () => {
  dbTest(
    'shows per-client / per-project income, VAT and total',
    async ({ page, db }) => {
      const client = await db.client.create({
        data: { name: 'Income Client' },
      });
      const subcontractor = await db.subcontractor.create({
        data: { name: 'Income Worker', companyNumber: '515222005' },
      });
      const project = await db.project.create({
        data: {
          clientId: client.id,
          name: 'Income Project',
          estimatedAmount: 300000,
          description: 'Monthly income test',
          requesterName: 'Test Requester',
          location: 'Test Location',
        },
      });
      await db.projectReport.create({
        data: {
          projectId: project.id,
          subcontractorId: subcontractor.id,
          date: new Date('2026-05-01'),
          profitMargin: 20,
          incomeEntries: {
            create: [{ amount: 50000, incomeDate: new Date('2026-05-15') }],
          },
        },
      });

      await page.goto(`${BASE}/income`);
      await page.waitForLoadState('networkidle');

      // Client card and its project row are rendered.
      await expect(
        page.getByRole('heading', { name: 'Income Client' }),
      ).toBeVisible();
      await expect(page.getByText('Income Project')).toBeVisible();

      // Income 50,000 excl. VAT appears on the project row.
      await expect(
        page.getByRole('row', { name: /Income Project/ }),
      ).toContainText('₪50,000');
    },
  );

  dbTest(
    'the income control row sums every client for the month',
    async ({ page, db }) => {
      const sub = await db.subcontractor.create({
        data: { name: 'GT Worker', companyNumber: '515222006' },
      });
      for (const [name, amount] of [
        ['Client A', 40000],
        ['Client B', 60000],
      ] as const) {
        const client = await db.client.create({ data: { name } });
        const project = await db.project.create({
          data: {
            clientId: client.id,
            name: `${name} Project`,
            estimatedAmount: 500000,
            description: 'gt',
            requesterName: 'Test Requester',
            location: 'Test Location',
          },
        });
        await db.projectReport.create({
          data: {
            projectId: project.id,
            subcontractorId: sub.id,
            date: new Date('2026-05-01'),
            profitMargin: 10,
            incomeEntries: {
              create: [{ amount, incomeDate: new Date('2026-05-10') }],
            },
          },
        });
      }

      await page.goto(`${BASE}/income`);
      await page.waitForLoadState('networkidle');

      // The income control row sums both clients: 40,000 + 60,000.
      await expect(page.getByRole('group', { name: 'Income' })).toContainText(
        '₪100,000',
      );
    },
  );

  dbTest(
    'marks income and VAT paid on their own days, or both at once',
    async ({ page, db }) => {
      const client = await db.client.create({ data: { name: 'Pay Client' } });
      const sub = await db.subcontractor.create({
        data: { name: 'Pay Worker', companyNumber: '515222007' },
      });
      const reports: Record<string, string> = {};
      for (const name of ['Split Project', 'Full Project']) {
        const project = await db.project.create({
          data: {
            clientId: client.id,
            name,
            estimatedAmount: 300000,
            description: 'paid marks',
            requesterName: 'Test Requester',
            location: 'Test Location',
          },
        });
        const report = await db.projectReport.create({
          data: {
            projectId: project.id,
            subcontractorId: sub.id,
            date: new Date('2026-05-01'),
            profitMargin: 10,
            incomeEntries: { create: [{ amount: 10000 }] },
          },
        });
        reports[name] = report.id;
      }
      const rate = await db.vatRate.findFirst({
        where: { effectiveMonth: { lte: new Date('2026-05-01') } },
        orderBy: { effectiveMonth: 'desc' },
      });
      const vat = (10000 * Number(rate.percentage)) / 100;
      const fmt = (n: number) => `₪${n.toLocaleString('en-US')}`;
      const paidAt = async (name: string) => {
        const r = await db.projectReport.findUniqueOrThrow({
          where: { id: reports[name] },
        });
        return [r.incomePaidAt, r.vatPaidAt].map(
          (d: Date | null) => d?.toISOString().slice(0, 10) ?? null,
        );
      };

      await page.goto(`${BASE}/income`);
      await page.waitForLoadState('networkidle');

      const income = page.getByRole('group', { name: 'Income' });
      const vatRow = page.getByRole('group', { name: 'VAT' });
      await expect(income).toContainText(fmt(20000));
      await expect(vatRow).toContainText(fmt(2 * vat));

      // The income now…
      await page
        .getByRole('button', {
          name: 'Mark paid — Income excl. VAT — Split Project',
        })
        .click();
      await page
        .getByLabel('Payment date — Income excl. VAT — Split Project')
        .fill('2026-05-12');
      await page
        .getByRole('button', {
          name: 'Mark paid — Income excl. VAT — Split Project',
        })
        .click();
      await expect
        .poll(() => paidAt('Split Project'))
        .toEqual(['2026-05-12', null]);

      // …and its VAT a month later, still on May's row.
      await page
        .getByRole('button', { name: 'Mark paid — VAT — Split Project' })
        .click();
      await page
        .getByLabel('Payment date — VAT — Split Project')
        .fill('2026-06-10');
      await page
        .getByRole('button', { name: 'Mark paid — VAT — Split Project' })
        .click();
      await expect
        .poll(() => paidAt('Split Project'))
        .toEqual(['2026-05-12', '2026-06-10']);

      // The other client paid everything at once.
      await page
        .getByRole('button', { name: 'Paid in full incl. VAT — Full Project' })
        .click();
      await page.getByLabel('Payment date — Full Project').fill('2026-05-20');
      await page
        .getByRole('button', { name: 'Paid in full incl. VAT — Full Project' })
        .click();
      await expect
        .poll(() => paidAt('Full Project'))
        .toEqual(['2026-05-20', '2026-05-20']);
      await expect(
        page.getByRole('button', {
          name: 'Paid in full incl. VAT — Full Project',
        }),
      ).toBeDisabled();

      // Everything is in: nothing left on either control row.
      await expect(income).toContainText(fmt(20000));
      await expect(
        vatRow.getByText('Remaining').locator('xpath=following-sibling::*'),
      ).toHaveText('₪0');

      // A mistake is undone by clicking the green ✓.
      await page
        .getByRole('button', {
          name: 'Mark unpaid — VAT — Split Project',
        })
        .click();
      await expect
        .poll(() => paidAt('Split Project'))
        .toEqual(['2026-05-12', null]);
      await expect(
        vatRow.getByText('Remaining').locator('xpath=following-sibling::*'),
      ).toHaveText(fmt(vat));
    },
  );

  dbTest(
    'shows who ordered each project and groups by them',
    async ({ page, db }) => {
      const sub = await db.subcontractor.create({
        data: { name: 'Req Worker', companyNumber: '515222009' },
      });
      for (const [clientName, projectName, requesterName] of [
        ['Req Client A', 'Req Project 1', 'Moshe'],
        ['Req Client B', 'Req Project 2', 'Moshe'],
        ['Req Client B', 'Req Project 3', 'Ruth'],
      ] as const) {
        const client =
          (await db.client.findFirst({ where: { name: clientName } })) ??
          (await db.client.create({ data: { name: clientName } }));
        const project = await db.project.create({
          data: {
            clientId: client.id,
            name: projectName,
            estimatedAmount: 100000,
            description: 'requester',
            requesterName,
            location: 'Test Location',
          },
        });
        await db.projectReport.create({
          data: {
            projectId: project.id,
            subcontractorId: sub.id,
            date: new Date('2026-05-01'),
            profitMargin: 10,
            incomeEntries: { create: [{ amount: 1000 }] },
          },
        });
      }

      await page.goto(`${BASE}/income`);
      await page.waitForLoadState('networkidle');

      await expect(
        page.getByRole('row', { name: /Req Project 3/ }),
      ).toContainText('Ruth');

      await page.getByRole('button', { name: 'Requester' }).click();
      const headings = page.getByRole('heading', { level: 2 });
      await expect(headings).toHaveText(['Moshe', 'Ruth']);
      // The column next to the project stays the requester.
      await expect(
        page.getByRole('row', { name: /Req Project 1/ }),
      ).toContainText('Moshe');
    },
  );

  dbTest(
    'shows an empty state when there is no income this month',
    async ({ page, db }) => {
      void db;
      await page.goto(`${BASE}/income`);
      await page.waitForLoadState('networkidle');

      await expect(
        page.getByText(/no income recorded this month/i),
      ).toBeVisible();
      await expect(page.getByRole('group', { name: 'Income' })).toHaveCount(0);
    },
  );
});
