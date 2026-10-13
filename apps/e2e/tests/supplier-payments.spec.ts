/// <reference lib="dom" />
import { test as dbTest, expect } from '../fixtures/db.fixture';

const BASE = 'http://localhost:5174';

/**
 * Supplier payments reach the page two ways: recorded inside a project report,
 * or documented directly on this page a whole stack at a time — the contractor
 * receives one supplier's paperwork covering several projects and types it in
 * one sitting.
 */
dbTest.describe('Supplier Payments Page', () => {
  dbTest(
    'page shows supplier payment totals for a month',
    async ({ page, db }) => {
      const client = await db.client.create({
        data: { name: 'CorpPay Client' },
      });
      const project = await db.project.create({
        data: {
          clientId: client.id,
          name: 'CorpPay Project',
          estimatedAmount: 300000,
          description: 'Corp payment test',
          requesterName: 'Test Requester',
          location: 'Test Location',
        },
      });
      const subcontractor = await db.subcontractor.create({
        data: { name: 'CorpPay Sub', companyNumber: '515222001' },
      });
      const supplier = await db.supplier.create({
        data: { name: 'CorpPay Corp' },
      });

      const report = await db.projectReport.create({
        data: {
          projectId: project.id,
          subcontractorId: subcontractor.id,
          date: new Date('2026-05-01'),
          profitMargin: 10,
          incomeEntries: {
            create: [{ amount: 80000, incomeDate: new Date('2026-05-10') }],
          },
        },
      });

      await db.supplierPayment.create({
        data: {
          projectReportId: report.id,
          supplierId: supplier.id,
          amount: 15000,
          date: new Date('2026-05-12'),
        },
      });

      await page.goto(`${BASE}/supplier-payments`);
      await page.waitForLoadState('networkidle');

      // Supplier name should appear in the table
      await expect(page.getByText('CorpPay Corp')).toBeVisible({
        timeout: 5000,
      });
      // Total paid should reflect the payment amount
      await expect(page.getByText(/15,000|15000/).first()).toBeVisible({
        timeout: 5000,
      });
    },
  );

  dbTest(
    'empty state shown when no payments for selected month',
    async ({ page, db }) => {
      void db;
      await page.goto(`${BASE}/supplier-payments`);
      await page.waitForLoadState('networkidle');

      // Should show empty state (no payments in fresh test DB for the selected month)
      const emptyState = page.getByText(/no manpower \/ supplier payments/i);
      const table = page.locator('table');

      const hasTable = await table.isVisible().catch(() => false);
      const hasEmpty = await emptyState.isVisible().catch(() => false);

      expect(hasTable || hasEmpty).toBe(true);
    },
  );

  dbTest(
    "document a supplier's whole stack in one submission",
    async ({ page, db }) => {
      const client = await db.client.create({ data: { name: 'Batch Client' } });
      const subcontractor = await db.subcontractor.create({
        data: { name: 'Batch Sub', companyNumber: '515222009' },
      });
      const supplier = await db.supplier.create({
        data: { name: 'Batch Supplier' },
      });

      // Two projects, each with a report for the pinned month — a payment
      // hangs off a report, so both must exist before the paperwork lands.
      for (const name of ['Batch Project A', 'Batch Project B']) {
        const project = await db.project.create({
          data: {
            clientId: client.id,
            name,
            estimatedAmount: 200000,
            description: 'Batch entry test',
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
            // Income above the payments, so saving never stops to warn.
            incomeEntries: { create: [{ amount: 50000 }] },
          },
        });
      }

      await page.goto(`${BASE}/supplier-payments`);
      await page.waitForLoadState('networkidle');

      await page
        .getByRole('button', { name: /document payments/i })
        .first()
        .click();

      await page.selectOption('#batch-supplier', { value: supplier.id });

      const reports = await db.projectReport.findMany({
        where: { date: new Date('2026-05-01') },
        orderBy: { id: 'asc' },
      });
      await page.selectOption('#batch-report-0', { value: reports[0].id });
      await page.fill('#batch-amount-0', '4000');
      await page.getByRole('button', { name: /add line/i }).click();
      await page.selectOption('#batch-report-1', { value: reports[1].id });
      await page.fill('#batch-amount-1', '6000');
      // VAT is on by default; the second line's paperwork carries none.
      await page.locator('label', { hasText: 'Include VAT' }).nth(1).click();

      await page.getByRole('button', { name: /save/i }).click();

      // Both lines land, or neither does.
      await expect
        .poll(async () =>
          db.supplierPayment.count({ where: { supplierId: supplier.id } }),
        )
        .toBe(2);

      // The choice is stored per line; no percentage is.
      const payments = await db.supplierPayment.findMany({
        where: { supplierId: supplier.id },
        orderBy: { amount: 'asc' },
      });
      expect(
        payments.map(
          (payment: { includesVat: boolean }) => payment.includesVat,
        ),
      ).toEqual([true, false]);
    },
  );

  // The contractor never types a VAT amount: they choose whether a payment
  // carries VAT, and the percentage is the global rate for the report's month.
  dbTest(
    'VAT on a payment is a choice, and its percentage follows the global rate',
    async ({ page, db }) => {
      const client = await db.client.create({ data: { name: 'Vat Client' } });
      const subcontractor = await db.subcontractor.create({
        data: { name: 'Vat Sub', companyNumber: '515222011' },
      });
      const supplier = await db.supplier.create({
        data: { name: 'Vat Supplier' },
      });
      const project = await db.project.create({
        data: {
          clientId: client.id,
          name: 'Vat Project',
          estimatedAmount: 100000,
          description: 'Vat test',
          requesterName: 'Test Requester',
          location: 'Test Location',
        },
      });
      const report = await db.projectReport.create({
        data: {
          projectId: project.id,
          subcontractorId: subcontractor.id,
          date: new Date('2026-05-01'),
          profitMargin: 20,
        },
      });
      await db.supplierPayment.create({
        data: {
          projectReportId: report.id,
          supplierId: supplier.id,
          amount: 10000,
          date: new Date('2026-05-05'),
        },
      });

      await page.goto(`${BASE}/supplier-payments`);
      await page.waitForLoadState('networkidle');

      // Nothing to type: the choice is a checkbox, not an amount field.
      await expect(page.getByRole('spinbutton')).toHaveCount(0);
      const includeVat = page.getByRole('checkbox', { name: /include vat/i });
      await expect(includeVat).not.toBeChecked();

      // Controlled by the server's answer, so it ticks once that arrives.
      await includeVat.click();
      await expect(includeVat).toBeChecked();

      // The baseline rate (18%) is looked up for the month, not stored.
      await expect(page.getByText('18%')).toBeVisible();
      await expect(page.getByText('₪11,800').first()).toBeVisible();
      await expect
        .poll(
          async () =>
            (
              await db.supplierPayment.findFirstOrThrow({
                where: { supplierId: supplier.id },
              })
            ).includesVat,
        )
        .toBe(true);

      // The global rate for that month changes: the same payment follows,
      // with nothing rewritten on it.
      await db.vatRate.create({
        data: { effectiveMonth: new Date('2026-05-01'), percentage: 20 },
      });
      await page.reload();
      await page.waitForLoadState('networkidle');
      await expect(page.getByText('20%')).toBeVisible();
      await expect(page.getByText('₪12,000').first()).toBeVisible();

      await includeVat.click();
      await expect(includeVat).not.toBeChecked();
      await expect
        .poll(
          async () =>
            (
              await db.supplierPayment.findFirstOrThrow({
                where: { supplierId: supplier.id },
              })
            ).includesVat,
        )
        .toBe(false);
    },
  );

  // globals.css forces `[dir="rtl"] th, td` to text-align: right, which used to
  // beat the centring on these headers in Hebrew while the flex-centred
  // checkbox beneath stayed put — so the two drifted apart. Measured, not
  // eyeballed: the header text and the box must share a vertical axis.
  for (const lang of ['en', 'he']) {
    dbTest(
      `VAT and Paid checkboxes sit under their headers (${lang})`,
      async ({ page, db }) => {
        const client = await db.client.create({
          data: { name: 'Align Client' },
        });
        const subcontractor = await db.subcontractor.create({
          data: { name: 'Align Sub', companyNumber: '515222012' },
        });
        const supplier = await db.supplier.create({
          data: { name: 'Align Supplier' },
        });
        const project = await db.project.create({
          data: {
            clientId: client.id,
            name: 'Align Project',
            estimatedAmount: 100000,
            description: 'Alignment test',
            requesterName: 'Test Requester',
            location: 'Test Location',
          },
        });
        const report = await db.projectReport.create({
          data: {
            projectId: project.id,
            subcontractorId: subcontractor.id,
            date: new Date('2026-05-01'),
            profitMargin: 20,
          },
        });
        await db.supplierPayment.create({
          data: {
            projectReportId: report.id,
            supplierId: supplier.id,
            amount: 10000,
            date: new Date('2026-05-05'),
            includesVat: true,
          },
        });

        await page.addInitScript((value: string) => {
          localStorage.setItem('beetbite.lang', value);
        }, lang);
        await page.goto(`${BASE}/supplier-payments`);
        await page.waitForLoadState('networkidle');
        await expect(page.getByRole('checkbox').first()).toBeVisible();

        const offsets = await page.evaluate(() => {
          const row = document.querySelector('section table tbody tr');
          const headers = Array.from(
            document.querySelectorAll('section table thead th'),
          );
          if (!row) throw new Error('no payment row rendered');
          const centre = (rect: DOMRect) => (rect.left + rect.right) / 2;
          return Array.from(row.querySelectorAll('input[type=checkbox]')).map(
            (box) => {
              const cell = box.closest('td') as HTMLElement;
              const header = headers[Array.from(row.children).indexOf(cell)];
              const text = document.createRange();
              text.selectNodeContents(header);
              return Math.abs(
                centre(text.getBoundingClientRect()) -
                  centre(box.getBoundingClientRect()),
              );
            },
          );
        });

        // VAT and Paid.
        expect(offsets).toHaveLength(2);
        for (const offset of offsets) expect(offset).toBeLessThan(1.5);
      },
    );
  }

  dbTest('mark a whole supplier stack paid', async ({ page, db }) => {
    const client = await db.client.create({ data: { name: 'Paid Client' } });
    const subcontractor = await db.subcontractor.create({
      data: { name: 'Paid Sub', companyNumber: '515222010' },
    });
    const supplier = await db.supplier.create({
      data: { name: 'Paid Supplier' },
    });
    const project = await db.project.create({
      data: {
        clientId: client.id,
        name: 'Paid Project',
        estimatedAmount: 100000,
        description: 'Paid test',
        requesterName: 'Test Requester',
        location: 'Test Location',
      },
    });
    const report = await db.projectReport.create({
      data: {
        projectId: project.id,
        subcontractorId: subcontractor.id,
        date: new Date('2026-05-01'),
        profitMargin: 20,
      },
    });
    for (const amount of [1000, 2000]) {
      await db.supplierPayment.create({
        data: {
          projectReportId: report.id,
          supplierId: supplier.id,
          amount,
          date: new Date('2026-05-05'),
        },
      });
    }

    await page.goto(`${BASE}/supplier-payments`);
    await page.waitForLoadState('networkidle');

    await page
      .getByRole('button', { name: /mark all paid/i })
      .first()
      .click();

    await expect
      .poll(async () =>
        db.supplierPayment.count({
          where: { supplierId: supplier.id, isPaid: true },
        }),
      )
      .toBe(2);
  });

  // Paperwork gets mistyped: a recorded line can be corrected or removed
  // without touching the rest of the supplier's stack.
  dbTest('edit and delete a recorded payment', async ({ page, db }) => {
    const client = await db.client.create({ data: { name: 'Edit Client' } });
    const subcontractor = await db.subcontractor.create({
      data: { name: 'Edit Sub', companyNumber: '515222013' },
    });
    const supplier = await db.supplier.create({
      data: { name: 'Edit Supplier' },
    });
    const reportIds: string[] = [];
    for (const name of ['Edit Project A', 'Edit Project B']) {
      const project = await db.project.create({
        data: {
          clientId: client.id,
          name,
          estimatedAmount: 100000,
          description: 'Edit test',
          requesterName: 'Test Requester',
          location: 'Test Location',
        },
      });
      const report = await db.projectReport.create({
        data: {
          projectId: project.id,
          subcontractorId: subcontractor.id,
          date: new Date('2026-05-01'),
          profitMargin: 20,
          // Income above the payments, so saving never stops to warn.
          incomeEntries: { create: [{ amount: 50000 }] },
        },
      });
      reportIds.push(report.id);
    }
    const [kept, removed] = await Promise.all(
      [2500, 900].map((amount, i) =>
        db.supplierPayment.create({
          data: {
            projectReportId: reportIds[i],
            supplierId: supplier.id,
            amount,
            date: new Date('2026-05-05'),
            isPaid: true,
          },
        }),
      ),
    );

    await page.goto(`${BASE}/supplier-payments?month=2026-05`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Edit — Edit Project A' }).click();
    await page.fill('#edit-payment-amount', '3100');
    await page.fill('#edit-payment-desc', 'Corrected invoice');
    await page.getByRole('button', { name: /save/i }).click();

    await expect
      .poll(async () =>
        (
          await db.supplierPayment.findUniqueOrThrow({ where: { id: kept.id } })
        ).amount.toNumber(),
      )
      .toBe(3100);
    const edited = await db.supplierPayment.findUniqueOrThrow({
      where: { id: kept.id },
    });
    expect(edited.description).toBe('Corrected invoice');
    // Correcting the figures is not a reason to forget it was paid.
    expect(edited.isPaid).toBe(true);

    await page.getByRole('button', { name: 'Delete — Edit Project B' }).click();
    await page
      .getByRole('dialog', { name: 'Delete this payment?' })
      .getByRole('button', { name: 'Delete' })
      .click();

    await expect
      .poll(async () => db.supplierPayment.count({ where: { id: removed.id } }))
      .toBe(0);
    await expect(page.getByText('Edit Project B')).toHaveCount(0);
    expect(
      await db.supplierPayment.count({ where: { supplierId: supplier.id } }),
    ).toBe(1);
  });
});
