import { test as dbTest, expect } from '../fixtures/db.fixture';

const BASE = 'http://localhost:5174';

dbTest.describe('Subcontractor Payments', () => {
  // The projects table keys its inputs by project id, so each test needs the
  // id the fixture just seeded.
  let projectId: string;

  dbTest.beforeEach(async ({ db }) => {
    const client = await db.client.create({ data: { name: 'SubPay Client' } });
    const subcontractor = await db.subcontractor.create({
      data: { name: 'SubPay Worker', companyNumber: '515222003' },
    });
    const project = await db.project.create({
      data: {
        clientId: client.id,
        name: 'SubPay Project',
        estimatedAmount: 200000,
        description: 'Subcontractor payment tests',
      },
    });
    projectId = project.id;
    // Create a project report for the current test month so the subcontractor appears
    await db.projectReport.create({
      data: {
        projectId: project.id,
        subcontractorId: subcontractor.id,
        date: new Date('2026-05-01'),
        profitMargin: 10,
        incomeEntries: { create: [{ amount: 50000, incomeDate: new Date('2026-05-15') }] },
      },
    });
  });

  /** Open the page and select the seeded subcontractor's card. */
  async function openWorkerPanel(page: import('@playwright/test').Page) {
    await page.goto(`${BASE}/subcontractor-payments`);
    await page.waitForLoadState('networkidle');
    await page.getByText('SubPay Worker').first().click();
  }

  /**
   * Wait for the payment write to land. The owed amount is already on screen
   * before any payment exists, so a text assertion would pass instantly and
   * race the POST — read the DB instead.
   */
  async function waitForPaymentCount(db: { subcontractorPayment: { findMany: () => Promise<unknown[]> } }, count: number) {
    await expect(async () => {
      expect(await db.subcontractorPayment.findMany()).toHaveLength(count);
    }).toPass({ timeout: 5000 });
  }

  /** Fill the inline partial row for the seeded project and save it. */
  async function payPartial(
    page: import('@playwright/test').Page,
    amount: string,
  ) {
    await page.getByTitle('Partial', { exact: true }).first().click();
    await page.fill(`#partial-${projectId}`, amount);
    await page.getByTitle('Save', { exact: true }).first().click();
  }

  dbTest('add partial payment → total paid updates in subcontractor card', async ({
    page,
    db,
  }) => {
    void db;
    await openWorkerPanel(page);
    await payPartial(page, '10000');

    // The card's "Paid" line appears once a payment exists.
    await expect(page.getByText(/10,000|10000/).first()).toBeVisible({ timeout: 5000 });
  });

  dbTest('overpay guard: payment exceeding amount owed is rejected', async ({
    page,
    db,
  }) => {
    void db;
    // Amount owed = income - (income × margin%) = 50000 - 5000 = 45000
    // Attempting to pay 50000 should exceed the owed amount
    await openWorkerPanel(page);
    await payPartial(page, '50000');

    // Backend rejects the overpayment (400) and the app surfaces the error in a
    // toast. Its presence is the proof of rejection (the toast auto-dismisses
    // after 3s, so assert it promptly).
    await expect(
      page.getByText(/would exceed amount owed/i),
    ).toBeVisible({ timeout: 5000 });

    // The card still shows the amount owed (45,000) and never records the payment.
    await expect(page.getByText(/₪45,000/).first()).toBeVisible();
  });

  dbTest('marking a project paid records the full amount owed', async ({
    page,
    db,
  }) => {
    void db;
    await openWorkerPanel(page);

    await page.getByTitle('Paid', { exact: true }).first().click();

    // Owed = 45000, and the whole owed amount is recorded as one payment.
    await expect(async () => {
      const payments = await db.subcontractorPayment.findMany();
      expect(payments).toHaveLength(1);
      expect(Number(payments[0].amount)).toBe(45000);
    }).toPass({ timeout: 5000 });
  });

  dbTest('a tag typed before saving is persisted and survives a reload', async ({
    page,
    db,
  }) => {
    void db;
    await openWorkerPanel(page);

    await page.fill(`#tag-${projectId}`, 'Materials');
    await page.getByTitle('Paid', { exact: true }).first().click();
    await waitForPaymentCount(db, 1);

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.getByText('SubPay Worker').first().click();

    await expect(page.locator(`#tag-${projectId}`)).toHaveValue('Materials', {
      timeout: 5000,
    });

    const payments = await db.subcontractorPayment.findMany();
    expect(payments).toHaveLength(1);
    expect(payments[0].tag).toBe('Materials');
  });

  dbTest('editing a tag on an existing payment saves on blur', async ({
    page,
    db,
  }) => {
    void db;
    await openWorkerPanel(page);

    await page.getByTitle('Paid', { exact: true }).first().click();
    await waitForPaymentCount(db, 1);

    await page.fill(`#tag-${projectId}`, 'Labor');
    // Blurring commits the tag-only update; no amount is sent, so the
    // overpayment guard is skipped.
    await page.locator(`#tag-${projectId}`).blur();

    await expect(async () => {
      const payments = await db.subcontractorPayment.findMany();
      expect(payments[0].tag).toBe('Labor');
    }).toPass({ timeout: 5000 });
  });

  dbTest('a saved tag is offered as an autocomplete suggestion', async ({
    page,
    db,
  }) => {
    void db;
    await openWorkerPanel(page);

    await page.fill(`#tag-${projectId}`, 'Materials');
    await page.getByTitle('Paid', { exact: true }).first().click();
    await waitForPaymentCount(db, 1);

    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(
      page.locator('#payment-tags option[value="Materials"]'),
    ).toHaveCount(1, { timeout: 5000 });
  });

  dbTest('a tag survives toggling a project unpaid and paid again', async ({
    page,
    db,
  }) => {
    void db;
    await openWorkerPanel(page);

    await page.fill(`#tag-${projectId}`, 'Materials');
    await page.getByTitle('Paid', { exact: true }).first().click();
    await waitForPaymentCount(db, 1);

    // Unpaid deletes the payment; Paid recreates it and must carry the tag over.
    await page.getByTitle('Unpaid', { exact: true }).first().click();
    await waitForPaymentCount(db, 0);
    await page.getByTitle('Paid', { exact: true }).first().click();

    await expect(async () => {
      const payments = await db.subcontractorPayment.findMany();
      expect(payments).toHaveLength(1);
      expect(payments[0].tag).toBe('Materials');
    }).toPass({ timeout: 5000 });
  });
});
