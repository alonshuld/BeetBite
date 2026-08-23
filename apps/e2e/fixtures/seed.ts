/**
 * Canonical baseline rows for the e2e database.
 *
 * Two tables sit outside the per-test truncation in `db.fixture.ts` because the
 * whole suite depends on them: `company_settings` is a singleton that
 * `OnboardingGate` redirects on when absent, and `vat_rates` carries forward, so
 * a stray row silently changes what later months resolve to.
 *
 * `global-setup.ts` seeds these once; the fixture restores them after every
 * test. Both import from here so there is exactly one definition of "baseline".
 */

/** The `CompanySettings` singleton's fixed primary key (see schema.prisma). */
export const COMPANY_SETTINGS_ID = 'company-settings';

/**
 * The baseline VAT rate's effective month. Deliberately far enough in the past
 * that it carries forward to every month the suite touches — and the cut-off
 * the fixture deletes above, so test-created rates are cleaned up but this one
 * survives.
 */
export const BASELINE_VAT_MONTH = new Date('2020-01-01T00:00:00.000Z');

/** Baseline VAT percentage. 18% is Israel's current rate. */
export const BASELINE_VAT_PERCENTAGE = 18;

/**
 * The contractor profile every test starts from. `name` and `companyNumber` are
 * both required by the PDF export, so they must never be left blank by a test.
 */
export const BASELINE_COMPANY_SETTINGS = {
  name: 'E2E Contractor Ltd.',
  companyNumber: '515000001',
  description: null,
  phone: null,
  email: null,
  addressStreet: null,
  addressCity: null,
  logo: null,
  signature: null,
} as const;

// The Prisma client is require()'d from the backend's generated output, so it
// arrives untyped — see the note in db.fixture.ts.
type PrismaLike = {
  companySettings: { upsert: (args: unknown) => Promise<unknown> };
  vatRate: { upsert: (args: unknown) => Promise<unknown> };
};

/**
 * Writes the baseline rows, overwriting whatever a test left behind.
 * Idempotent — safe to call from both global setup and per-test teardown.
 */
export async function seedBaseline(prisma: PrismaLike): Promise<void> {
  await prisma.companySettings.upsert({
    where: { id: COMPANY_SETTINGS_ID },
    update: BASELINE_COMPANY_SETTINGS,
    create: { id: COMPANY_SETTINGS_ID, ...BASELINE_COMPANY_SETTINGS },
  });

  await prisma.vatRate.upsert({
    where: { effectiveMonth: BASELINE_VAT_MONTH },
    update: { percentage: BASELINE_VAT_PERCENTAGE },
    create: {
      effectiveMonth: BASELINE_VAT_MONTH,
      percentage: BASELINE_VAT_PERCENTAGE,
    },
  });
}
