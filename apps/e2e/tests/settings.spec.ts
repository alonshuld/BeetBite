import type { Page } from '@playwright/test';
import { test as dbTest, expect } from '../fixtures/db.fixture';
import { COMPANY_SETTINGS_ID, BASELINE_VAT_PERCENTAGE } from '../fixtures/seed';

const BASE = 'http://localhost:5174';

/**
 * Coverage for the two settings screens. Both write rows the rest of the suite
 * depends on — `db.fixture.ts` restores the baseline afterwards, so a test here
 * blanking the company name cannot break the PDF export or OnboardingGate for
 * whatever runs next.
 */

dbTest.describe('Settings — company profile', () => {
  dbTest.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/settings/company`);
    await page.waitForLoadState('networkidle');
  });

  dbTest('seeds the form from the saved settings', async ({ page, db }) => {
    void db;
    await expect(page.locator('#company-name')).toHaveValue(
      'E2E Contractor Ltd.',
    );
    await expect(page.locator('#company-number')).toHaveValue('515000001');
  });

  dbTest('saving persists every profile field', async ({ page, db }) => {
    await page.fill('#company-name', 'Renamed Contracting');
    await page.fill('#company-description', 'Groundworks specialists');
    await page.fill('#company-number', '515777666');
    await page.fill('#company-phone', '+972508887777');
    await page.fill('#company-email', 'office@example.com');
    await page.fill('#company-address-street', 'HaHaroshet 5');
    await page.fill('#company-address-city', 'Ashkelon');

    await page.getByRole('button', { name: 'Save' }).click();

    await expect(async () => {
      const settings = await db.companySettings.findUnique({
        where: { id: COMPANY_SETTINGS_ID },
      });
      expect(settings).toMatchObject({
        name: 'Renamed Contracting',
        description: 'Groundworks specialists',
        companyNumber: '515777666',
        phone: '+972508887777',
        email: 'office@example.com',
        addressStreet: 'HaHaroshet 5',
        addressCity: 'Ashkelon',
      });
    }).toPass({ timeout: 5000 });
  });

  dbTest('saving persists the PDF colors', async ({ page, db }) => {
    await expect(page.locator('#company-pdf-primary-color')).toHaveValue(
      '#1f2a44',
    );
    await page.fill('#company-pdf-primary-color', '#0B6E4F');
    await page.fill('#company-pdf-secondary-color', '#e07a5f');

    await page.getByRole('button', { name: 'Save' }).click();

    await expect(async () => {
      const settings = await db.companySettings.findUnique({
        where: { id: COMPANY_SETTINGS_ID },
      });
      expect(settings).toMatchObject({
        pdfPrimaryColor: '#0b6e4f',
        pdfSecondaryColor: '#e07a5f',
      });
    }).toPass({ timeout: 5000 });
  });

  dbTest('saving persists the PDF font', async ({ page, db }) => {
    await expect(page.locator('#company-pdf-font')).toHaveValue(
      'noto-sans-hebrew',
    );
    await page.selectOption('#company-pdf-font', 'frank-ruhl-libre');
    await expect(page.getByTestId('pdf-font-preview')).toHaveCSS(
      'font-family',
      /Frank Ruhl Libre/,
    );

    await page.getByRole('button', { name: 'Save' }).click();

    await expect(async () => {
      const settings = await db.companySettings.findUnique({
        where: { id: COMPANY_SETTINGS_ID },
      });
      expect(settings.pdfFont).toBe('frank-ruhl-libre');
    }).toPass({ timeout: 5000 });
  });

  dbTest('ignores a half-typed hex color', async ({ page, db }) => {
    await page.fill('#company-pdf-primary-color', '#0b6');

    await page.getByRole('button', { name: 'Save' }).click();

    await expect(async () => {
      const settings = await db.companySettings.findUnique({
        where: { id: COMPANY_SETTINGS_ID },
      });
      expect(settings.pdfPrimaryColor).toBe('#1f2a44');
    }).toPass({ timeout: 5000 });
  });

  dbTest('stores a blanked optional field as null', async ({ page, db }) => {
    await page.fill('#company-phone', '+972508887777');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(async () => {
      const settings = await db.companySettings.findUnique({
        where: { id: COMPANY_SETTINGS_ID },
      });
      expect(settings.phone).toBe('+972508887777');
    }).toPass({ timeout: 5000 });

    await page.fill('#company-phone', '   ');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(async () => {
      const settings = await db.companySettings.findUnique({
        where: { id: COMPANY_SETTINGS_ID },
      });
      expect(settings.phone).toBeNull();
    }).toPass({ timeout: 5000 });
  });

  dbTest('survives a reload with the saved values', async ({ page, db }) => {
    void db;
    await page.fill('#company-name', 'Reload Contracting');
    await page.getByRole('button', { name: 'Save' }).click();

    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#company-name')).toHaveValue(
      'Reload Contracting',
    );
  });
});

dbTest.describe('Settings — VAT rates', () => {
  /** Fills the VAT form and saves. The month picker defaults to today. */
  async function setRate(page: Page, percentage: string) {
    await page.getByLabel('VAT %').fill(percentage);
    await page.getByRole('button', { name: 'Save' }).click();
  }

  dbTest.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/settings/vat`);
    await page.waitForLoadState('networkidle');
  });

  dbTest('shows the resolved rate and its history', async ({ page, db }) => {
    void db;
    await expect(
      page.getByText(`${BASELINE_VAT_PERCENTAGE}%`).first(),
    ).toBeVisible();
  });

  dbTest('saving a rate adds it to the history', async ({ page, db }) => {
    await setRate(page, '21');

    await expect(async () => {
      const rates = await db.vatRate.findMany({
        orderBy: { effectiveMonth: 'desc' },
      });
      expect(
        rates.map((r: { percentage: unknown }) => Number(r.percentage)),
      ).toContain(21);
    }).toPass({ timeout: 5000 });

    await expect(page.getByText('21%').first()).toBeVisible();
  });

  dbTest(
    'saving twice for one month overwrites rather than appending',
    async ({ page, db }) => {
      await setRate(page, '21');
      await expect(async () => {
        const rates = await db.vatRate.findMany();
        expect(rates).toHaveLength(2); // baseline + this month
      }).toPass({ timeout: 5000 });

      await setRate(page, '22');

      await expect(async () => {
        const rates = await db.vatRate.findMany();
        // effectiveMonth is @unique, so the second save must upsert.
        expect(rates).toHaveLength(2);
        expect(
          rates.map((r: { percentage: unknown }) => Number(r.percentage)),
        ).toContain(22);
        expect(
          rates.map((r: { percentage: unknown }) => Number(r.percentage)),
        ).not.toContain(21);
      }).toPass({ timeout: 5000 });
    },
  );

  dbTest('rejects an out-of-range percentage', async ({ page, db }) => {
    await setRate(page, '101');

    // handleSave bails before the request, so nothing is written.
    await page.waitForTimeout(500);
    const rates = await db.vatRate.findMany();
    expect(rates).toHaveLength(1);
  });

  dbTest(
    'leaves the save button disabled while empty',
    async ({ page, db }) => {
      void db;
      await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
    },
  );
});
