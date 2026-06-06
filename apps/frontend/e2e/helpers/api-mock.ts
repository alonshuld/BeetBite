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
 *
 * IMPORTANT: Playwright matches routes in REVERSE registration order — the most
 * recently registered handler is tried first. Therefore generic/catch-all
 * routes must be registered BEFORE more specific ones (so the specific route,
 * registered later, wins). For the same reason, per-test overrides must be
 * registered AFTER calling this function (or via the `overrides` param) so they
 * take precedence over the defaults below.
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

  // --- Monthly reports list (generic first, specific last) ---
  // Catch-all for any month → no report.
  await page.route(`${BASE}/projects/reports?month=*`, (route) =>
    route.fulfill({ json: [] }),
  );
  // Explicitly-empty month.
  await page.route(`${BASE}/projects/reports?month=2025-12-01`, (route) =>
    route.fulfill({ json: [] }),
  );
  // The test month → the seeded report list (registered last so it wins).
  await page.route(`${BASE}/projects/reports?month=${TEST_MONTH}-01`, (route) =>
    route.fulfill({ json: reportList }),
  );

  // Report detail — GET returns the detail shape. Non-GET (PUT/DELETE) calls
  // route.fallback() so a per-test mutation override (registered earlier, i.e.
  // lower priority) receives the request. Mutation routes are intentionally NOT
  // registered here: only the capture tests exercise mutations and each supplies
  // its own handler, so registering generics would shadow those overrides.
  await page.route(`${BASE}/projects/reports/${REPORT_ID}`, (route) =>
    route.request().method() === "GET"
      ? route.fulfill({ json: reportDetail })
      : route.fallback(),
  );
}

/** Navigate to the project reports page for the test project + month. */
export function projectReportsUrl(
  projectId = PROJECT_ID,
  month = TEST_MONTH,
): string {
  return `/reports/projects/${projectId}?month=${month}`;
}
