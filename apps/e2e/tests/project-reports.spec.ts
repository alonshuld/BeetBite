import { test as dbTest, expect } from '../fixtures/db.fixture';

const BASE = 'http://localhost:5174';

// ── Seed helpers ──────────────────────────────────────────────────────────────

async function seedBaseData(db: ReturnType<typeof Object>) {
  const client = await db.client.create({ data: { name: 'Reports Client' } });
  const project = await db.project.create({
    data: {
      clientId: client.id,
      name: 'Reports Project',
      estimatedAmount: 200000,
      description: 'For e2e report tests',
      requesterName: 'Test Requester',
      location: 'Test Location',
    },
  });
  const subcontractor = await db.subcontractor.create({
    data: { name: 'Reports Sub', companyNumber: '515222004' },
  });
  const supplier = await db.supplier.create({
    data: { name: 'Reports Corp' },
  });
  const supplier2 = await db.supplier.create({
    data: { name: 'Reports Corp 2' },
  });
  return { client, project, subcontractor, supplier, supplier2 };
}

async function seedReport(
  db: ReturnType<typeof Object>,
  opts: {
    projectId: string;
    subcontractorId: string;
    date: string;
    profitMargin: number;
    incomeEntries: Array<{ amount: number; incomeDate?: string }>;
    supplierPayments?: Array<{
      supplierId: string;
      amount: number;
      date?: string;
    }>;
  },
) {
  const report = await db.projectReport.create({
    data: {
      projectId: opts.projectId,
      subcontractorId: opts.subcontractorId,
      date: new Date(opts.date),
      profitMargin: opts.profitMargin,
      incomeEntries: {
        create: opts.incomeEntries.map((e) => ({
          amount: e.amount,
          ...(e.incomeDate ? { incomeDate: new Date(e.incomeDate) } : {}),
        })),
      },
    },
  });

  for (const cp of opts.supplierPayments ?? []) {
    await db.supplierPayment.create({
      data: {
        projectReportId: report.id,
        supplierId: cp.supplierId,
        amount: cp.amount,
        ...(cp.date ? { date: new Date(cp.date) } : {}),
      },
    });
  }

  return report;
}

// ── Helper to get the modal inner card ───────────────────────────────────────
// FormModal renders: div.fixed.inset-0.z-50 > div.bg-surface (inner card)
function getModal(page: ReturnType<typeof Object>) {
  return page.locator('.fixed.inset-0.z-50 > div');
}

// ── Tests ─────────────────────────────────────────────────────────────────────

dbTest.describe('Project Reports — page header', () => {
  dbTest(
    'shows project name, description, estimated amount, completion',
    async ({ page, db }) => {
      const { project, subcontractor } = await seedBaseData(db);
      await seedReport(db, {
        projectId: project.id,
        subcontractorId: subcontractor.id,
        date: '2026-05-01',
        profitMargin: 10,
        incomeEntries: [{ amount: 50000, incomeDate: '2026-05-15' }],
      });

      await page.goto(`${BASE}/reports/projects/${project.id}`);
      await page.waitForLoadState('networkidle');

      await expect(
        page.getByRole('heading', { name: 'Reports Project' }),
      ).toBeVisible();
      await expect(page.getByText('For e2e report tests')).toBeVisible();
      await expect(page.getByText(/₪200,000/)).toBeVisible();
      await expect(page.getByText(/Completion/i)).toBeVisible();
    },
  );

  dbTest('back button navigates to /reports', async ({ page, db }) => {
    const { project } = await seedBaseData(db);

    await page.goto(`${BASE}/reports/projects/${project.id}`);
    await page.waitForLoadState('networkidle');

    // The back control is an icon + label button: a `chevronLeft` SVG, so the
    // accessible name is the label alone.
    await page.getByRole('button', { name: /Project Reports/i }).click();
    // The back button returns to the reports list, scoped to the project's client
    // via an optional `?clientId=` query param.
    await expect(page).toHaveURL(new RegExp(`/reports(\\?clientId=.+)?$`));
  });
});

dbTest.describe('Project Reports — empty state', () => {
  dbTest(
    'shows empty state and add button when no report for month',
    async ({ page, db }) => {
      const { project } = await seedBaseData(db);

      await page.goto(`${BASE}/reports/projects/${project.id}?month=2026-05`);
      await page.waitForLoadState('networkidle');

      await expect(page.getByText(/No report for this month/i)).toBeVisible();
      await expect(
        page.getByRole('button', { name: /Add Report/i }),
      ).toBeVisible();
    },
  );
});

dbTest.describe('Project Reports — create via modal', () => {
  dbTest(
    'create report → displays income amount, profit %, subcontractor',
    async ({ page, db }) => {
      const { project } = await seedBaseData(db);

      await page.goto(`${BASE}/reports/projects/${project.id}`);
      await page.waitForLoadState('networkidle');

      await page
        .getByRole('button', { name: /\+ Add/i })
        .first()
        .click();

      const modal = getModal(page);
      await expect(modal).toBeVisible();

      await modal
        .locator('select')
        .first()
        .selectOption({ label: 'Reports Sub' });
      await modal.locator('input[type="number"]').nth(0).fill('20');
      await modal.locator('input[type="number"]').nth(1).fill('100000');

      await page.getByRole('button', { name: 'Save' }).click();

      await expect(page.getByText(/₪100,000/)).toBeVisible({ timeout: 8000 });
      await expect(page.getByText(/20%/)).toBeVisible();
      await expect(page.getByText('Reports Sub')).toBeVisible();
    },
  );

  dbTest(
    'create report with income date → shows Received status',
    async ({ page, db }) => {
      const { project } = await seedBaseData(db);

      await page.goto(`${BASE}/reports/projects/${project.id}`);
      await page.waitForLoadState('networkidle');

      await page
        .getByRole('button', { name: /\+ Add/i })
        .first()
        .click();

      const modal = getModal(page);
      await modal
        .locator('select')
        .first()
        .selectOption({ label: 'Reports Sub' });
      await modal.locator('input[type="number"]').nth(0).fill('10');
      await modal.locator('input[type="number"]').nth(1).fill('40000');
      await modal.locator('input[type="date"]').nth(0).fill('2026-05-15');

      await page.getByRole('button', { name: 'Save' }).click();

      await expect(page.getByText(/Received/i)).toBeVisible({ timeout: 8000 });
    },
  );

  dbTest(
    'create report without income date → shows Payment pending',
    async ({ page, db }) => {
      const { project } = await seedBaseData(db);

      await page.goto(`${BASE}/reports/projects/${project.id}`);
      await page.waitForLoadState('networkidle');

      await page
        .getByRole('button', { name: /\+ Add/i })
        .first()
        .click();

      const modal = getModal(page);
      await modal
        .locator('select')
        .first()
        .selectOption({ label: 'Reports Sub' });
      await modal.locator('input[type="number"]').nth(0).fill('10');
      await modal.locator('input[type="number"]').nth(1).fill('40000');
      // Leave income date empty

      await page.getByRole('button', { name: 'Save' }).click();

      await expect(page.getByText(/Payment pending/i)).toBeVisible({
        timeout: 8000,
      });
    },
  );

  dbTest(
    'create report with multiple income entries → shows total income',
    async ({ page, db }) => {
      const { project } = await seedBaseData(db);

      await page.goto(`${BASE}/reports/projects/${project.id}`);
      await page.waitForLoadState('networkidle');

      await page
        .getByRole('button', { name: /\+ Add/i })
        .first()
        .click();

      const modal = getModal(page);
      await modal
        .locator('select')
        .first()
        .selectOption({ label: 'Reports Sub' });
      await modal.locator('input[type="number"]').nth(0).fill('15');
      await modal.locator('input[type="number"]').nth(1).fill('30000');

      // Add second income entry
      await modal.getByRole('button', { name: /\+ Add Income/i }).click();
      await modal.locator('input[type="number"]').nth(2).fill('20000');

      // Add third income entry
      await modal.getByRole('button', { name: /\+ Add Income/i }).click();
      await modal.locator('input[type="number"]').nth(3).fill('10000');

      await page.getByRole('button', { name: 'Save' }).click();

      // Total = 60000
      await expect(page.getByText(/Total Income/i)).toBeVisible({
        timeout: 8000,
      });
      await expect(page.getByText(/₪60,000/)).toBeVisible();
    },
  );

  dbTest(
    'create report with supplier payment → shows corp name and deduction',
    async ({ page, db }) => {
      const { project } = await seedBaseData(db);

      await page.goto(`${BASE}/reports/projects/${project.id}`);
      await page.waitForLoadState('networkidle');

      await page
        .getByRole('button', { name: /\+ Add/i })
        .first()
        .click();

      const modal = getModal(page);
      await modal
        .locator('select')
        .nth(0)
        .selectOption({ label: 'Reports Sub' });
      await modal.locator('input[type="number"]').nth(0).fill('10');
      await modal.locator('input[type="number"]').nth(1).fill('60000');

      // Add supplier payment — the "+ Add" in the corp payments section
      await modal.getByRole('button', { name: /^\+ Add$/i }).click();

      // Corp section: select nth(1) is the corp select, number nth(2) is corp amount
      await modal
        .locator('select')
        .nth(1)
        .selectOption({ label: 'Reports Corp' });
      await modal.locator('input[type="number"]').nth(2).fill('15000');

      await page.getByRole('button', { name: 'Save' }).click();

      await expect(page.getByText('Reports Corp', { exact: true })).toBeVisible(
        { timeout: 8000 },
      );
      await expect(page.getByText(/− ₪15,000/)).toBeVisible();
    },
  );

  dbTest(
    'create report with multiple supplier payments → all appear',
    async ({ page, db }) => {
      const { project } = await seedBaseData(db);

      await page.goto(`${BASE}/reports/projects/${project.id}`);
      await page.waitForLoadState('networkidle');

      await page
        .getByRole('button', { name: /\+ Add/i })
        .first()
        .click();

      const modal = getModal(page);
      await modal
        .locator('select')
        .nth(0)
        .selectOption({ label: 'Reports Sub' });
      await modal.locator('input[type="number"]').nth(0).fill('12');
      await modal.locator('input[type="number"]').nth(1).fill('80000');

      // First corp payment
      await modal.getByRole('button', { name: /^\+ Add$/i }).click();
      await modal
        .locator('select')
        .nth(1)
        .selectOption({ label: 'Reports Corp' });
      await modal.locator('input[type="number"]').nth(2).fill('18000');

      // Second corp payment
      await modal.getByRole('button', { name: /^\+ Add$/i }).click();
      await modal
        .locator('select')
        .nth(2)
        .selectOption({ label: 'Reports Corp 2' });
      await modal.locator('input[type="number"]').nth(3).fill('12000');

      await page.getByRole('button', { name: 'Save' }).click();

      await expect(
        page.getByText('Reports Corp', { exact: true }).first(),
      ).toBeVisible({ timeout: 8000 });
      await expect(page.getByText('Reports Corp 2').first()).toBeVisible();
      await expect(page.getByText(/− ₪18,000/)).toBeVisible();
      await expect(page.getByText(/− ₪12,000/)).toBeVisible();
    },
  );
});

dbTest.describe('Project Reports — edit via modal', () => {
  dbTest(
    'edit report profit margin → updates displayed percentage',
    async ({ page, db }) => {
      const { project, subcontractor } = await seedBaseData(db);

      await seedReport(db, {
        projectId: project.id,
        subcontractorId: subcontractor.id,
        date: '2026-05-01',
        profitMargin: 10,
        incomeEntries: [{ amount: 50000 }],
      });

      await page.goto(`${BASE}/reports/projects/${project.id}`);
      await page.waitForLoadState('networkidle');

      // nth(0) = main Edit button (opens modal)
      await page.getByRole('button', { name: 'Edit' }).nth(0).click();

      const modal = getModal(page);
      await expect(modal).toBeVisible();

      // Clear and update profit margin (nth(0) = profit margin in modal)
      const marginInput = modal.locator('input[type="number"]').nth(0);
      await marginInput.fill('25');

      await page.getByRole('button', { name: 'Save' }).click();

      await expect(page.getByText(/25%/)).toBeVisible({ timeout: 8000 });
    },
  );

  dbTest('cancel modal → no changes applied', async ({ page, db }) => {
    const { project, subcontractor } = await seedBaseData(db);

    await seedReport(db, {
      projectId: project.id,
      subcontractorId: subcontractor.id,
      date: '2026-05-01',
      profitMargin: 10,
      incomeEntries: [{ amount: 50000 }],
    });

    await page.goto(`${BASE}/reports/projects/${project.id}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Edit' }).nth(0).click();

    const modal = getModal(page);
    await modal.locator('input[type="number"]').nth(0).fill('99');

    await page.getByRole('button', { name: 'Cancel' }).click();

    // Modal should close and original 10% still shown
    await expect(modal).not.toBeVisible();
    await expect(page.getByText(/10%/)).toBeVisible();
  });
});

dbTest.describe('Project Reports — previous month inheritance', () => {
  dbTest(
    'new report inherits subcontractor and profit margin from previous month',
    async ({ page, db }) => {
      const { project, subcontractor } = await seedBaseData(db);

      // Seed April report
      await seedReport(db, {
        projectId: project.id,
        subcontractorId: subcontractor.id,
        date: '2026-04-01',
        profitMargin: 18,
        incomeEntries: [{ amount: 40000 }],
      });

      // Navigate to May (no report exists)
      await page.goto(`${BASE}/reports/projects/${project.id}?month=2026-05`);
      await page.waitForLoadState('networkidle');

      await page
        .getByRole('button', { name: /\+ Add/i })
        .first()
        .click();

      const modal = getModal(page);
      await expect(modal).toBeVisible();

      // Select the subcontractor manually (backend will inherit if omitted; select it anyway)
      await modal
        .locator('select')
        .first()
        .selectOption({ label: 'Reports Sub' });
      // Fill income (required); leave profit margin empty so backend inherits from April
      await modal.locator('input[type="number"]').nth(1).fill('50000');

      await page.getByRole('button', { name: 'Save' }).click();

      // Backend inherited profitMargin 18 from April → profit = 50000 * 0.18 = 9000
      await expect(page.getByText(/₪9,000/)).toBeVisible({ timeout: 8000 });
      // Subcontractor name appears in the report
      await expect(page.getByText('Reports Sub')).toBeVisible();
    },
  );
});

dbTest.describe('Project Reports — financial calculations', () => {
  dbTest('profit = income × margin / 100', async ({ page, db }) => {
    const { project } = await seedBaseData(db);

    await page.goto(`${BASE}/reports/projects/${project.id}`);
    await page.waitForLoadState('networkidle');

    await page
      .getByRole('button', { name: /\+ Add/i })
      .first()
      .click();

    const modal = getModal(page);
    await modal
      .locator('select')
      .first()
      .selectOption({ label: 'Reports Sub' });
    await modal.locator('input[type="number"]').nth(0).fill('20');
    await modal.locator('input[type="number"]').nth(1).fill('100000');

    await page.getByRole('button', { name: 'Save' }).click();

    // Profit = 100000 * 20 / 100 = 20000
    await expect(page.getByText(/₪20,000/)).toBeVisible({ timeout: 8000 });
  });

  dbTest(
    'subcontractor payment = income − profit − supplier payments',
    async ({ page, db }) => {
      const { project } = await seedBaseData(db);

      await page.goto(`${BASE}/reports/projects/${project.id}`);
      await page.waitForLoadState('networkidle');

      await page
        .getByRole('button', { name: /\+ Add/i })
        .first()
        .click();

      const modal = getModal(page);
      await modal
        .locator('select')
        .nth(0)
        .selectOption({ label: 'Reports Sub' });
      await modal.locator('input[type="number"]').nth(0).fill('10');
      await modal.locator('input[type="number"]').nth(1).fill('80000');

      // Corp payment = 15000
      await modal.getByRole('button', { name: /^\+ Add$/i }).click();
      await modal
        .locator('select')
        .nth(1)
        .selectOption({ label: 'Reports Corp' });
      await modal.locator('input[type="number"]').nth(2).fill('15000');

      await page.getByRole('button', { name: 'Save' }).click();

      // Subcontractor = 80000 - 8000 - 15000 = 57000
      await expect(page.getByText(/₪57,000/)).toBeVisible({ timeout: 8000 });
    },
  );
});

dbTest.describe('Project Reports — inline income entry operations', () => {
  dbTest(
    'add income entry inline → appears in report with updated total',
    async ({ page, db }) => {
      const { project, subcontractor } = await seedBaseData(db);

      await seedReport(db, {
        projectId: project.id,
        subcontractorId: subcontractor.id,
        date: '2026-05-01',
        profitMargin: 10,
        incomeEntries: [{ amount: 30000, incomeDate: '2026-05-10' }],
      });

      await page.goto(`${BASE}/reports/projects/${project.id}`);
      await page.waitForLoadState('networkidle');

      // Click inline "+ Add Income"
      await page.getByRole('button', { name: /\+ Add Income/i }).click();

      // Inline form appears — fill the last number input and date input
      const allNumberInputs = page.locator('input[type="number"]');
      await allNumberInputs.last().fill('15000');

      const allDateInputs = page.locator('input[type="date"]');
      await allDateInputs.last().fill('2026-05-20');

      // Click the inline "Add" button
      await page.getByRole('button', { name: /^Add$/i }).last().click();

      // Both entries visible, total = 45000
      await expect(page.getByText(/Total Income/i)).toBeVisible({
        timeout: 5000,
      });
      await expect(page.getByText(/₪45,000/).first()).toBeVisible();
    },
  );

  dbTest(
    'edit income entry inline → updates displayed amount',
    async ({ page, db }) => {
      const { project, subcontractor } = await seedBaseData(db);

      await seedReport(db, {
        projectId: project.id,
        subcontractorId: subcontractor.id,
        date: '2026-05-01',
        profitMargin: 10,
        incomeEntries: [{ amount: 25000 }],
      });

      await page.goto(`${BASE}/reports/projects/${project.id}`);
      await page.waitForLoadState('networkidle');

      // "Edit" buttons order: nth(0) = main Edit Report, nth(1) = income entry Edit
      await page.getByRole('button', { name: 'Edit' }).nth(1).click();

      // Inline form shows — first visible number input is the entry amount
      const amountInput = page.locator('input[type="number"]').first();
      await amountInput.fill('35000');

      // Save inline edit (only Save button visible on page at this point)
      await page.getByRole('button', { name: 'Save' }).click();

      await expect(page.getByText(/₪35,000/)).toBeVisible({ timeout: 5000 });
    },
  );

  dbTest(
    'delete income entry → entry amount no longer shown',
    async ({ page, db }) => {
      const { project, subcontractor } = await seedBaseData(db);

      await seedReport(db, {
        projectId: project.id,
        subcontractorId: subcontractor.id,
        date: '2026-05-01',
        profitMargin: 10,
        incomeEntries: [{ amount: 30000 }, { amount: 20000 }],
      });

      await page.goto(`${BASE}/reports/projects/${project.id}`);
      await page.waitForLoadState('networkidle');

      await expect(page.getByText(/₪30,000/)).toBeVisible();
      await expect(page.getByText(/₪20,000/)).toBeVisible();

      // Remove first income entry (first Remove button = first income entry)
      await page.getByRole('button', { name: 'Remove' }).nth(0).click();

      // ₪30,000 should disappear; ₪20,000 remains
      await expect(page.getByText(/₪30,000/)).not.toBeVisible({
        timeout: 5000,
      });
      await expect(page.getByText(/₪20,000/)).toBeVisible();
    },
  );
});

dbTest.describe('Project Reports — inline supplier payment operations', () => {
  dbTest(
    'add supplier payment inline → appears with corp name and amount',
    async ({ page, db }) => {
      const { project, subcontractor, supplier } = await seedBaseData(db);

      await seedReport(db, {
        projectId: project.id,
        subcontractorId: subcontractor.id,
        date: '2026-05-01',
        profitMargin: 10,
        incomeEntries: [{ amount: 50000 }],
      });

      await page.goto(`${BASE}/reports/projects/${project.id}`);
      await page.waitForLoadState('networkidle');

      // Click inline "+ Manpower / Supplier Payments"
      await page
        .getByRole('button', { name: /\+ Manpower \/ Supplier Payments/i })
        .click();

      // Fill inline form
      await page
        .locator('select')
        .last()
        .selectOption({ label: 'Reports Corp' });
      await page.locator('input[type="number"]').last().fill('12000');

      // Submit inline form
      await page.getByRole('button', { name: /^Add$/i }).last().click();

      await expect(page.getByText('Reports Corp', { exact: true })).toBeVisible(
        { timeout: 5000 },
      );
      await expect(page.getByText(/− ₪12,000/)).toBeVisible();

      void supplier;
    },
  );

  dbTest(
    'edit supplier payment inline → updates amount',
    async ({ page, db }) => {
      const { project, subcontractor, supplier } = await seedBaseData(db);

      const report = await seedReport(db, {
        projectId: project.id,
        subcontractorId: subcontractor.id,
        date: '2026-05-01',
        profitMargin: 10,
        incomeEntries: [{ amount: 50000 }],
        supplierPayments: [{ supplierId: supplier.id, amount: 10000 }],
      });

      await page.goto(`${BASE}/reports/projects/${project.id}`);
      await page.waitForLoadState('networkidle');

      await expect(page.getByText(/− ₪10,000/)).toBeVisible();

      // "Edit" buttons: nth(0) = main Edit Report, nth(1) = income entry Edit, nth(2) = corp payment Edit
      await page.getByRole('button', { name: 'Edit' }).nth(2).click();

      // Inline corp edit form: number input is the first/only input visible
      await page.locator('input[type="number"]').first().fill('12500');

      await page.getByRole('button', { name: 'Save' }).click();

      await expect(page.getByText(/− ₪12,500/)).toBeVisible({
        timeout: 5000,
      });
      void report;
    },
  );

  dbTest(
    'delete supplier payment → removed from report',
    async ({ page, db }) => {
      const { project, subcontractor, supplier } = await seedBaseData(db);

      await seedReport(db, {
        projectId: project.id,
        subcontractorId: subcontractor.id,
        date: '2026-05-01',
        profitMargin: 10,
        incomeEntries: [{ amount: 50000 }],
        supplierPayments: [{ supplierId: supplier.id, amount: 10000 }],
      });

      await page.goto(`${BASE}/reports/projects/${project.id}`);
      await page.waitForLoadState('networkidle');

      await expect(
        page.getByText('Reports Corp', { exact: true }),
      ).toBeVisible();
      await expect(page.getByText(/− ₪10,000/)).toBeVisible();

      // "Remove" buttons: nth(0) = income entry Remove, nth(1) = corp payment Remove
      await page.getByRole('button', { name: 'Remove' }).nth(1).click();

      await expect(
        page.getByText('Reports Corp', { exact: true }),
      ).not.toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/− ₪10,000/)).not.toBeVisible();
    },
  );
});

dbTest.describe('Project Reports — month navigation', () => {
  dbTest(
    'navigating to different months shows the correct report',
    async ({ page, db }) => {
      const { project, subcontractor } = await seedBaseData(db);

      await seedReport(db, {
        projectId: project.id,
        subcontractorId: subcontractor.id,
        date: '2026-04-01',
        profitMargin: 10,
        incomeEntries: [{ amount: 30000 }],
      });

      await seedReport(db, {
        projectId: project.id,
        subcontractorId: subcontractor.id,
        date: '2026-05-01',
        profitMargin: 15,
        incomeEntries: [{ amount: 40000 }],
      });

      // April
      await page.goto(`${BASE}/reports/projects/${project.id}?month=2026-04`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByText(/₪30,000/)).toBeVisible();

      // May
      await page.goto(`${BASE}/reports/projects/${project.id}?month=2026-05`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByText(/₪40,000/)).toBeVisible();
    },
  );

  dbTest(
    'navigating to month with no report shows empty state',
    async ({ page, db }) => {
      const { project, subcontractor } = await seedBaseData(db);

      await seedReport(db, {
        projectId: project.id,
        subcontractorId: subcontractor.id,
        date: '2026-05-01',
        profitMargin: 10,
        incomeEntries: [{ amount: 50000 }],
      });

      // Navigate to a month with no report
      await page.goto(`${BASE}/reports/projects/${project.id}?month=2026-06`);
      await page.waitForLoadState('networkidle');

      await expect(page.getByText(/No report for this month/i)).toBeVisible();
    },
  );
});

dbTest.describe('Project Reports — modal remove income entry', () => {
  dbTest(
    'remove income entry draft in modal when multiple entries exist',
    async ({ page, db }) => {
      const { project } = await seedBaseData(db);

      await page.goto(`${BASE}/reports/projects/${project.id}`);
      await page.waitForLoadState('networkidle');

      await page
        .getByRole('button', { name: /\+ Add/i })
        .first()
        .click();

      const modal = getModal(page);
      await modal
        .locator('select')
        .first()
        .selectOption({ label: 'Reports Sub' });
      await modal.locator('input[type="number"]').nth(0).fill('10');
      await modal.locator('input[type="number"]').nth(1).fill('30000');

      // Add second income entry
      await modal.getByRole('button', { name: /\+ Add Income/i }).click();
      await modal.locator('input[type="number"]').nth(2).fill('20000');

      // Remove button should now be visible (appears when >1 entry)
      await modal.getByRole('button', { name: 'Remove' }).first().click();

      // After removal, only one entry remains → no Remove button
      await expect(
        modal.getByRole('button', { name: 'Remove' }),
      ).not.toBeVisible();

      // Save — only the second entry (20000) was kept
      await page.getByRole('button', { name: 'Save' }).click();

      await expect(page.getByText(/₪20,000/)).toBeVisible({ timeout: 8000 });
    },
  );
});
