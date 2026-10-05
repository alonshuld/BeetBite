import { test as dbTest, expect } from '../fixtures/db.fixture';
import { COMPANY_SETTINGS_ID } from '../fixtures/seed';

const BASE = 'http://localhost:5174';

/**
 * OnboardingGate redirects every authenticated route to /onboarding while the
 * company-settings singleton is missing.
 *
 * These tests delete that row, which the rest of the suite needs — the fixture
 * restores it in teardown, and `serial` keeps the deletion from overlapping a
 * sibling test in this file.
 */
dbTest.describe.serial('Onboarding', () => {
  dbTest(
    'redirects every authenticated route while settings are missing',
    async ({ page, db }) => {
      await db.companySettings.deleteMany();

      await page.goto(`${BASE}/reports`);
      await expect(page).toHaveURL(/\/onboarding$/);

      await page.goto(`${BASE}/clients`);
      await expect(page).toHaveURL(/\/onboarding$/);
    },
  );

  dbTest(
    'saving the profile creates the row and lets the app through',
    async ({ page, db }) => {
      await db.companySettings.deleteMany();

      await page.goto(`${BASE}/reports`);
      await expect(page).toHaveURL(/\/onboarding$/);

      await page.fill('#company-name', 'Fresh Contractor');
      await page.fill('#company-number', '515123123');
      await page.getByRole('button', { name: 'Save & Continue' }).click();

      await expect(page).toHaveURL(/\/reports$/);

      const settings = await db.companySettings.findUnique({
        where: { id: COMPANY_SETTINGS_ID },
      });
      expect(settings).toMatchObject({
        name: 'Fresh Contractor',
        companyNumber: '515123123',
      });
    },
  );

  dbTest(
    'skipping still creates the row and leaves onboarding',
    async ({ page, db }) => {
      await db.companySettings.deleteMany();

      await page.goto(`${BASE}/onboarding`);
      await page.getByRole('button', { name: 'Skip for now' }).click();

      await expect(page).toHaveURL(/\/reports$/);

      // The nudge is skippable, not a gate — an all-null row is enough to pass it.
      const settings = await db.companySettings.findUnique({
        where: { id: COMPANY_SETTINGS_ID },
      });
      expect(settings).not.toBeNull();
      expect(settings.name).toBeNull();
    },
  );

  dbTest(
    'is scrollable on a short screen so the buttons stay reachable',
    async ({ page, db }) => {
      await db.companySettings.deleteMany();
      await page.setViewportSize({ width: 1024, height: 500 });

      await page.goto(`${BASE}/onboarding`);
      const save = page.getByRole('button', { name: 'Save & Continue' });
      await expect(save).toBeAttached();

      // body is overflow:hidden, so the page must scroll itself.
      await expect
        .poll(() =>
          page.evaluate(() => {
            const el = document
              .querySelector('h1')
              ?.closest('.overflow-y-auto');
            return el ? el.scrollHeight > el.clientHeight : false;
          }),
        )
        .toBe(true);

      await save.scrollIntoViewIfNeeded();
      await expect(save).toBeInViewport();
      await save.click();
      await expect(page).toHaveURL(/\/reports$/);
    },
  );

  dbTest('does not redirect once settings exist', async ({ page, db }) => {
    void db;
    await page.goto(`${BASE}/reports`);

    await expect(page).toHaveURL(/\/reports$/);
  });
});
