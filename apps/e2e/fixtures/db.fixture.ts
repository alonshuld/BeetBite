import { test as base } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { BASELINE_VAT_MONTH, seedBaseline } from './seed';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require(
  path.resolve(__dirname, '../../backend/src/generated/client'),
);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaPg } = require('@prisma/adapter-pg');

export type DbFixture = {
  db: any;
};

// `db` is `any` (PrismaClient is require()'d from the backend's generated
// output), which stops TS from contextually typing Playwright's `use`
// callback — so annotate it rather than leave it an implicit any.

type Use = (value: any) => Promise<void>;

// Internal: the db fixture on its own. Not exported — the only export is the
// auth-wrapped `test` below, so there is exactly one binding named `test`.
const testWithDb = base.extend<DbFixture>({
  db: async ({}, use: Use) => {
    const databaseUrl = process.env.E2E_DATABASE_URL;
    if (!databaseUrl) throw new Error('E2E_DATABASE_URL not set');

    const adapter = new PrismaPg({ connectionString: databaseUrl });
    const prisma = new PrismaClient({ adapter });

    await use(prisma);

    // Truncate in FK-safe order after each test
    await prisma.subcontractorPayment.deleteMany();
    await prisma.supplierPayment.deleteMany();
    await prisma.projectReport.deleteMany();
    await prisma.project.deleteMany();
    await prisma.client.deleteMany();
    await prisma.subcontractor.deleteMany();
    await prisma.supplier.deleteMany();
    await prisma.initiator.deleteMany();

    // VAT rates and company settings are not business rows — they are suite
    // baseline. Drop only the rates a test added (anything after the baseline
    // month), then restore the baseline over whatever a test wrote. Without
    // this, a leftover VAT rate changes what later months resolve to, and a
    // settings test that blanks `name` breaks both the PDF export and
    // OnboardingGate for every test that follows.
    await prisma.vatRate.deleteMany({
      where: { effectiveMonth: { gt: BASELINE_VAT_MONTH } },
    });
    await seedBaseline(prisma);

    await prisma.$disconnect();
  },
});

// Extend test to apply auth state from file
const testWithAuth = testWithDb.extend({
  page: async ({ page }, use) => {
    // Load auth state from file and inject localStorage via addInitScript.
    // addInitScript runs before any page scripts on every navigation, so
    // authSlice's initialState reads the token before React mounts.
    const authFilePath = path.resolve(
      __dirname,
      '../playwright/.auth/user.json',
    );
    if (fs.existsSync(authFilePath)) {
      const authState = JSON.parse(fs.readFileSync(authFilePath, 'utf-8'));

      if (authState.origins && authState.origins[0]) {
        const origin = authState.origins[0];
        if (origin.localStorage) {
          await page.addInitScript(
            (items: Array<{ name: string; value: string }>) => {
              items.forEach((item) => {
                localStorage.setItem(item.name, item.value);
              });
            },
            origin.localStorage,
          );
        }
      }
    }

    // Pin the global month picker so monthly views are deterministic and do not
    // drift with the real system clock. The app otherwise defaults the month to
    // "today", which would hide the fixed seed data (dated 2026-05) once the real
    // date moves past May 2026. All seeds use 2026-05 (current) / 2026-04 (prev).
    await page.addInitScript(() => {
      localStorage.setItem('beetbite.month', '2026-05');
    });

    await use(page);
  },
});

export { expect } from '@playwright/test';
// The single `test` export: db fixture + auth state + pinned month. Tests import
// it as `test as dbTest`.
export { testWithAuth as test };
