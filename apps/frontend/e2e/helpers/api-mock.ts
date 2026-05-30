import type { Page } from "@playwright/test";
import {
  mockProject,
  mockReportList,
  mockReportDetail,
  mockSubcontractors,
  mockCorporations,
  PROJECT_ID,
  REPORT_ID,
  TEST_MONTH,
} from "../fixtures/project-reports";

const BASE = "**/api/v1";

export interface RouteOverrides {
  reportList?: object[];
  reportDetail?: object;
}

/**
 * Registers all API routes the ProjectReportsPage needs.
 * Call this AFTER any per-test page.route() overrides — Playwright
 * matches in registration order (first match wins).
 */
export async function setupPageRoutes(
  page: Page,
  overrides: RouteOverrides = {},
): Promise<void> {
  const reportList = overrides.reportList ?? mockReportList;
  const reportDetail = overrides.reportDetail ?? mockReportDetail;

  // Project list — includes the test project
  await page.route(`${BASE}/projects?*`, (route) =>
    route.fulfill({ json: [mockProject] }),
  );

  // Subcontractors list
  await page.route(`${BASE}/subcontractors?*`, (route) =>
    route.fulfill({ json: mockSubcontractors }),
  );
  await page.route(`${BASE}/subcontractors`, (route) =>
    route.fulfill({ json: mockSubcontractors }),
  );

  // Corporations list
  await page.route(`${BASE}/corporations?*`, (route) =>
    route.fulfill({ json: mockCorporations }),
  );
  await page.route(`${BASE}/corporations`, (route) =>
    route.fulfill({ json: mockCorporations }),
  );

  // Monthly reports list
  await page.route(`${BASE}/projects/reports?month=${TEST_MONTH}-01`, (route) =>
    route.fulfill({ json: reportList }),
  );

  // Empty month — returns no report for the test project
  await page.route(`${BASE}/projects/reports?month=2025-12-01`, (route) =>
    route.fulfill({ json: [] }),
  );

  // Catch-all for other months
  await page.route(`${BASE}/projects/reports?month=*`, (route) =>
    route.fulfill({ json: [] }),
  );

  // Report detail
  await page.route(`${BASE}/projects/reports/${REPORT_ID}`, (route) =>
    route.fulfill({ json: reportDetail }),
  );

  // Mutations — return 200 OK; tests that care about the body should
  // register a specific route override BEFORE calling setupPageRoutes.
  await page.route(`${BASE}/projects/reports`, (route) =>
    route.fulfill({ json: mockReportList[0] }),
  );
  await page.route(`${BASE}/projects/reports/${REPORT_ID}`, (route) =>
    route.fulfill({ json: mockReportList[0] }),
  );
  await page.route(
    `${BASE}/projects/reports/${REPORT_ID}/income-entries`,
    (route) =>
      route.fulfill({
        json: { id: "new-entry", amount: 10000, incomeDate: null },
      }),
  );
  await page.route(`${BASE}/projects/reports/income-entries/*`, (route) =>
    route.fulfill({ json: {} }),
  );
  await page.route(`${BASE}/corporations/payments`, (route) =>
    route.fulfill({ json: { id: "new-corp-pay" } }),
  );
  await page.route(`${BASE}/corporations/payments/*`, (route) =>
    route.fulfill({ json: {} }),
  );
}

/** Navigate to the project reports page for the test project + month. */
export function projectReportsUrl(
  projectId = PROJECT_ID,
  month = TEST_MONTH,
): string {
  return `/reports/projects/${projectId}?month=${month}`;
}
