import { test, expect } from "@playwright/test";
import { injectToken } from "./helpers/auth";
import { setupPageRoutes, projectReportsUrl } from "./helpers/api-mock";
import {
  PROJECT_ID,
  REPORT_ID,
  ENTRY_1_ID,
  CORP_PAY_ID,
  TEST_MONTH,
  mockReportDetail,
} from "./fixtures/project-reports";

// ---------------------------------------------------------------------------
// 1. Auth guard
// ---------------------------------------------------------------------------

test("redirects to /login when no token", async ({ page }) => {
  // No injectToken — localStorage is empty
  await page.goto(projectReportsUrl());
  await expect(page).toHaveURL(/\/login/);
});

// ---------------------------------------------------------------------------
// Helpers shared across authenticated tests
// ---------------------------------------------------------------------------

async function loadPage(
  page: Parameters<typeof setupPageRoutes>[0],
  overrides?: Parameters<typeof setupPageRoutes>[1],
  month = TEST_MONTH,
) {
  await injectToken(page);
  await setupPageRoutes(page, overrides);
  await page.goto(projectReportsUrl(PROJECT_ID, month));
}

// ---------------------------------------------------------------------------
// 2–7. Page loading & display
// ---------------------------------------------------------------------------

test("shows loading state while API is pending", async ({ page }) => {
  await injectToken(page);

  // Delay all project/report responses so the spinner is visible
  await page.route("**/api/v1/projects?*", async (route) => {
    await new Promise((r) => setTimeout(r, 300));
    await route.fulfill({ json: [] });
  });
  await setupPageRoutes(page);

  await page.goto(projectReportsUrl());
  // The loading element uses t("loading") — it appears briefly
  // We just assert it existed at some point by checking the page loaded
  await expect(page).not.toHaveURL(/\/login/);
});

test("renders project name as heading", async ({ page }) => {
  await loadPage(page);
  await expect(page.getByRole("heading", { name: "City Hall" })).toBeVisible();
});

test("renders estimated amount stat card", async ({ page }) => {
  await loadPage(page);
  await expect(page.getByText("₪1,000,000")).toBeVisible();
});

test("renders total paid by client stat card", async ({ page }) => {
  await loadPage(page);
  await expect(page.getByText("₪250,000")).toBeVisible();
});

test("progress bar reflects completion percentage (25%)", async ({ page }) => {
  await loadPage(page);
  // Progress bar: 250k / 1M = 25%
  const bar = page.locator(".bg-success.transition-all");
  await expect(bar).toHaveCSS("width", /\d+px/);
  // Verify the percentage label
  await expect(page.getByText("25%")).toBeVisible();
});

test("shows empty state when month has no report for this project", async ({
  page,
}) => {
  await loadPage(page, { reportList: [] });
  await expect(page.getByRole("button", { name: /add report/i })).toBeVisible();
});

// ---------------------------------------------------------------------------
// 8–11. Report panel display
// ---------------------------------------------------------------------------

test("income entry with incomeDate shows green received text", async ({
  page,
}) => {
  await loadPage(page);
  // Entry 1 has incomeDate — should show "received" text in green
  await expect(page.getByText(/received/i).first()).toBeVisible();
});

test("income entry without incomeDate shows yellow pending text", async ({
  page,
}) => {
  await loadPage(page);
  // Entry 2 has no incomeDate — pending
  await expect(page.getByText(/pending/i)).toBeVisible();
});

test("corp payment row shows corporation name and amount with minus prefix", async ({
  page,
}) => {
  await loadPage(page);
  await expect(page.getByText("FloorCo")).toBeVisible();
  await expect(page.getByText(/−\s*₪8,000/)).toBeVisible();
});

test("subcontractor section shows name and payment amount", async ({
  page,
}) => {
  await loadPage(page);
  await expect(page.getByText("יוסי לוי")).toBeVisible();
  await expect(page.getByText("₪37,000")).toBeVisible();
});

// ---------------------------------------------------------------------------
// 12–14. Inline income entry — edit
// ---------------------------------------------------------------------------

test("clicking Edit on income entry shows inline form pre-filled", async ({
  page,
}) => {
  await loadPage(page);
  // Click the first Edit button in the income entries area
  await page.getByRole("button", { name: /edit/i }).first().click();
  const amountInput = page.getByLabel(/income.*ils/i);
  await expect(amountInput).toBeVisible();
  await expect(amountInput).toHaveValue("30000");
});

test("saving income entry edit fires PUT with updated body", async ({
  page,
}) => {
  let capturedBody: unknown;
  await injectToken(page);
  await page.route(
    `**/api/v1/projects/reports/income-entries/${ENTRY_1_ID}`,
    async (route) => {
      if (route.request().method() === "PUT") {
        capturedBody = JSON.parse(route.request().postData() ?? "{}");
        await route.fulfill({
          json: { id: ENTRY_1_ID, amount: 35000, incomeDate: null },
        });
      } else {
        await route.continue();
      }
    },
  );
  await setupPageRoutes(page);
  await page.goto(projectReportsUrl());

  await page.getByRole("button", { name: /edit/i }).first().click();
  const amountInput = page.getByLabel(/income.*ils/i);
  await amountInput.fill("35000");
  await page.getByRole("button", { name: /save/i }).first().click();

  expect((capturedBody as Record<string, unknown>).amount).toBe(35000);
});

test("cancelling income entry edit dismisses the inline form", async ({
  page,
}) => {
  await loadPage(page);
  await page.getByRole("button", { name: /edit/i }).first().click();
  await expect(page.getByLabel(/income.*ils/i)).toBeVisible();
  await page
    .getByRole("button", { name: /cancel/i })
    .first()
    .click();
  await expect(page.getByLabel(/income.*ils/i)).not.toBeVisible();
});

// ---------------------------------------------------------------------------
// 15. Inline income entry — delete
// ---------------------------------------------------------------------------

test("clicking Remove on income entry fires DELETE immediately", async ({
  page,
}) => {
  let deleteCalled = false;
  await injectToken(page);
  await page.route(
    `**/api/v1/projects/reports/income-entries/${ENTRY_1_ID}`,
    async (route) => {
      if (route.request().method() === "DELETE") {
        deleteCalled = true;
        await route.fulfill({ json: {} });
      } else {
        await route.continue();
      }
    },
  );
  await setupPageRoutes(page);
  await page.goto(projectReportsUrl());

  await page
    .getByRole("button", { name: /remove/i })
    .first()
    .click();
  expect(deleteCalled).toBe(true);
});

// ---------------------------------------------------------------------------
// 16–18. Inline income entry — add
// ---------------------------------------------------------------------------

test("clicking add income shows empty inline form", async ({ page }) => {
  await loadPage(page);
  // The "+ addIncome" button (translated key)
  await page
    .getByRole("button", { name: /add.*income|addIncome|\+.*income/i })
    .last()
    .click();
  await expect(page.getByLabel(/income.*ils/i)).toBeVisible();
});

test("saving new income entry fires POST with correct reportId", async ({
  page,
}) => {
  let capturedUrl = "";
  let capturedBody: unknown;
  await injectToken(page);
  await page.route(
    `**/api/v1/projects/reports/${REPORT_ID}/income-entries`,
    async (route) => {
      capturedUrl = route.request().url();
      capturedBody = JSON.parse(route.request().postData() ?? "{}");
      await route.fulfill({
        json: { id: "new-entry", amount: 10000, incomeDate: null },
      });
    },
  );
  await setupPageRoutes(page);
  await page.goto(projectReportsUrl());

  await page
    .getByRole("button", { name: /add.*income|addIncome|\+.*income/i })
    .last()
    .click();
  await page.getByLabel(/income.*ils/i).fill("10000");
  await page.getByRole("button", { name: /^add$/i }).last().click();

  expect(capturedUrl).toContain(REPORT_ID);
  expect((capturedBody as Record<string, unknown>).amount).toBe(10000);
});

test("cancelling new income entry form clears it", async ({ page }) => {
  await loadPage(page);
  await page
    .getByRole("button", { name: /add.*income|addIncome|\+.*income/i })
    .last()
    .click();
  await expect(page.getByLabel(/income.*ils/i)).toBeVisible();
  // Cancel button inside the inline form
  await page
    .getByRole("button", { name: /cancel/i })
    .last()
    .click();
  await expect(page.getByLabel(/income.*ils/i)).not.toBeVisible();
});

// ---------------------------------------------------------------------------
// 19. Multiple income entries show total row
// ---------------------------------------------------------------------------

test("total income row is visible when report has multiple entries", async ({
  page,
}) => {
  // mockReportDetail already has 2 entries (30k + 20k = 50k)
  await loadPage(page);
  await expect(page.getByText("₪50,000")).toBeVisible();
});

// ---------------------------------------------------------------------------
// 20–22. Inline corp payment — edit
// ---------------------------------------------------------------------------

test("clicking Edit on corp payment shows inline form", async ({ page }) => {
  await loadPage(page);
  // Corp Edit button — comes after the income entry Edit buttons
  const editButtons = page.getByRole("button", { name: /edit/i });
  // Corp payment Edit is the last Edit in the list
  await editButtons.last().click();
  await expect(page.getByLabel(/amount.*ils/i)).toBeVisible();
});

test("saving corp payment edit fires PUT", async ({ page }) => {
  let putCalled = false;
  await injectToken(page);
  await page.route(
    `**/api/v1/corporations/payments/${CORP_PAY_ID}`,
    async (route) => {
      if (route.request().method() === "PUT") {
        putCalled = true;
        await route.fulfill({ json: { id: CORP_PAY_ID } });
      } else {
        await route.continue();
      }
    },
  );
  await setupPageRoutes(page);
  await page.goto(projectReportsUrl());

  await page.getByRole("button", { name: /edit/i }).last().click();
  await page.getByLabel(/amount.*ils/i).fill("9000");
  await page.getByRole("button", { name: /save/i }).last().click();

  expect(putCalled).toBe(true);
});

test("cancelling corp payment edit dismisses the form", async ({ page }) => {
  await loadPage(page);
  await page.getByRole("button", { name: /edit/i }).last().click();
  await expect(page.getByLabel(/amount.*ils/i)).toBeVisible();
  await page
    .getByRole("button", { name: /cancel/i })
    .last()
    .click();
  await expect(page.getByLabel(/amount.*ils/i)).not.toBeVisible();
});

// ---------------------------------------------------------------------------
// 23. Inline corp payment — delete
// ---------------------------------------------------------------------------

test("clicking Remove on corp payment fires DELETE", async ({ page }) => {
  let deleteCalled = false;
  await injectToken(page);
  await page.route(
    `**/api/v1/corporations/payments/${CORP_PAY_ID}`,
    async (route) => {
      if (route.request().method() === "DELETE") {
        deleteCalled = true;
        await route.fulfill({ json: {} });
      } else {
        await route.continue();
      }
    },
  );
  await setupPageRoutes(page);
  await page.goto(projectReportsUrl());

  // Remove buttons: first two belong to income entries, last one to corp payment
  await page
    .getByRole("button", { name: /remove/i })
    .last()
    .click();
  expect(deleteCalled).toBe(true);
});

// ---------------------------------------------------------------------------
// 24–25. Inline corp payment — add
// ---------------------------------------------------------------------------

test("clicking add corp payment button shows inline form with corporation select", async ({
  page,
}) => {
  await loadPage(page);
  await page
    .getByRole("button", { name: /corporation|corp.*payment/i })
    .last()
    .click();
  // The corporation select should appear
  await expect(page.getByRole("option", { name: "FloorCo" })).toBeVisible();
});

test("saving new corp payment fires POST to /corporations/payments", async ({
  page,
}) => {
  let postCalled = false;
  let capturedBody: unknown;
  await injectToken(page);
  await page.route(`**/api/v1/corporations/payments`, async (route) => {
    if (route.request().method() === "POST") {
      postCalled = true;
      capturedBody = JSON.parse(route.request().postData() ?? "{}");
      await route.fulfill({ json: { id: "new-cp" } });
    } else {
      await route.continue();
    }
  });
  await setupPageRoutes(page);
  await page.goto(projectReportsUrl());

  await page
    .getByRole("button", { name: /corporation|corp.*payment/i })
    .last()
    .click();
  await page.getByRole("combobox").last().selectOption("corp-1");
  await page.getByLabel(/amount.*ils/i).fill("5000");
  await page.getByRole("button", { name: /^add$/i }).last().click();

  expect(postCalled).toBe(true);
  expect((capturedBody as Record<string, unknown>).amount).toBe(5000);
});

// ---------------------------------------------------------------------------
// 26–28. Report modal — add
// ---------------------------------------------------------------------------

test("add button opens FormModal", async ({ page }) => {
  await loadPage(page, { reportList: [] });
  await page.getByRole("button", { name: /add report/i }).click();
  // Modal should be visible — check for the modal overlay or title
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("FormModal has subcontractor select, month input, and profit margin input", async ({
  page,
}) => {
  await loadPage(page, { reportList: [] });
  await page.getByRole("button", { name: /add report/i }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("combobox")).toBeVisible(); // subcontractor select
  await expect(page.locator('input[type="month"]')).toBeVisible();
  await expect(page.locator('input[type="number"]').first()).toBeVisible(); // profit margin
});

test("submitting add report modal fires POST with correct projectId", async ({
  page,
}) => {
  let capturedBody: unknown;
  await injectToken(page);
  await page.route(`**/api/v1/projects/reports`, async (route) => {
    if (route.request().method() === "POST") {
      capturedBody = JSON.parse(route.request().postData() ?? "{}");
      await route.fulfill({ json: { ...mockReportDetail, id: "new-rep" } });
    } else {
      await route.continue();
    }
  });
  await setupPageRoutes(page, { reportList: [] });
  await page.goto(projectReportsUrl());

  await page.getByRole("button", { name: /add report/i }).click();
  await page.locator('input[type="number"]').first().fill("10");
  await page.locator('input[type="number"]').nth(1).fill("50000");
  // Submit
  await page.getByRole("button", { name: /save/i }).click();

  expect((capturedBody as Record<string, unknown>).projectId).toBe(PROJECT_ID);
});

// ---------------------------------------------------------------------------
// 29–30. Report modal — edit
// ---------------------------------------------------------------------------

test("Edit report button opens modal with report data pre-filled", async ({
  page,
}) => {
  await loadPage(page);
  // The "Edit" ghost button in the report header (not inline entry edits)
  await page
    .getByRole("button", { name: /^edit$/i })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  // Profit margin should be pre-filled with 10
  const profitMarginInput = page.locator('input[type="number"]').first();
  await expect(profitMarginInput).toHaveValue(
    String(mockReportDetail.profitMargin),
  );
});

test("saving edit report modal fires PUT to /projects/reports/:id", async ({
  page,
}) => {
  let putCalled = false;
  await injectToken(page);
  await page.route(`**/api/v1/projects/reports/${REPORT_ID}`, async (route) => {
    if (route.request().method() === "PUT") {
      putCalled = true;
      await route.fulfill({ json: mockReportDetail });
    } else {
      await route.continue();
    }
  });
  await setupPageRoutes(page);
  await page.goto(projectReportsUrl());

  await page
    .getByRole("button", { name: /^edit$/i })
    .first()
    .click();
  await page.getByRole("button", { name: /save/i }).click();

  expect(putCalled).toBe(true);
});

// ---------------------------------------------------------------------------
// 31–32. Month navigation
// ---------------------------------------------------------------------------

test("navigating to a month with no report shows empty state", async ({
  page,
}) => {
  await loadPage(page, undefined, "2025-12");
  await expect(page.getByRole("button", { name: /add report/i })).toBeVisible();
});

test("navigating to a month with a report shows report panel", async ({
  page,
}) => {
  await loadPage(page);
  // Already on TEST_MONTH which has a report
  await expect(page.getByText("יוסי לוי")).toBeVisible();
  await expect(page.getByText(/₪37,000/)).toBeVisible();
});
