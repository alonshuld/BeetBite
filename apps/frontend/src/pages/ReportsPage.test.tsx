import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/renderWithProviders";
import ReportsPage from "./ReportsPage";

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useOutletContext: vi.fn(() => ({ month: "2025-03" })) };
});

vi.mock("@/api/endpoints/project-reports", () => ({
  useGetProjectReportsQuery: vi.fn(),
  useCreateProjectReportMutation: vi.fn(),
}));
vi.mock("@/api/endpoints/clients", () => ({ useGetClientsQuery: vi.fn() }));
vi.mock("@/api/endpoints/projects", () => ({ useGetProjectsQuery: vi.fn() }));
vi.mock("@/api/endpoints/subcontractors", () => ({
  useGetSubcontractorsQuery: vi.fn(),
}));
vi.mock("@/api/endpoints/suppliers", () => ({
  useGetSuppliersQuery: vi.fn(),
}));
vi.mock("@/api/endpoints/project-report-exports", () => ({
  useExportProjectReportsPdfMutation: vi.fn(),
}));

import {
  useGetProjectReportsQuery,
  useCreateProjectReportMutation,
} from "@/api/endpoints/project-reports";
import { useGetClientsQuery } from "@/api/endpoints/clients";
import { useGetProjectsQuery } from "@/api/endpoints/projects";
import { useGetSubcontractorsQuery } from "@/api/endpoints/subcontractors";
import { useGetSuppliersQuery } from "@/api/endpoints/suppliers";
import { useExportProjectReportsPdfMutation } from "@/api/endpoints/project-report-exports";

const mockReports = [
  {
    id: "r1",
    date: "2025-03-01",
    project: {
      id: "p1",
      name: "Tower Block",
      client: { id: "c1", name: "Acme Corp" },
    },
    subcontractor: { id: "s1", name: "Bob the Builder" },
    totalIncome: 10000,
    profitMargin: 20,
    supplierPayments: [],
    incomeEntries: [
      { id: "ie1", amount: 6000, incomeDate: "2025-03-10", tag: "Shell" },
      { id: "ie2", amount: 4000, incomeDate: null, tag: "Finishing" },
    ],
  },
];

const createSpy = vi
  .fn()
  .mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });

const exportSpy = vi
  .fn()
  .mockReturnValue({ unwrap: vi.fn().mockResolvedValue(new Blob()) });

function setReports(data: unknown, isLoading = false) {
  vi.mocked(useGetProjectReportsQuery).mockReturnValue({
    data,
    isLoading,
  } as unknown as ReturnType<typeof useGetProjectReportsQuery>);
}

function renderPage() {
  return renderWithProviders(<ReportsPage />, {
    preloadedState: { auth: { token: "test-token" } },
    initialEntries: ["/reports"],
  });
}

describe("ReportsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setReports(mockReports);
    vi.mocked(useGetClientsQuery).mockReturnValue({
      data: [{ id: "c1", name: "Acme Corp" }],
    } as unknown as ReturnType<typeof useGetClientsQuery>);
    vi.mocked(useGetProjectsQuery).mockReturnValue({
      data: [{ id: "p1", name: "Tower Block", clientId: "c1" }],
    } as unknown as ReturnType<typeof useGetProjectsQuery>);
    vi.mocked(useGetSubcontractorsQuery).mockReturnValue({
      data: [{ id: "s1", name: "Bob the Builder" }],
    } as unknown as ReturnType<typeof useGetSubcontractorsQuery>);
    vi.mocked(useGetSuppliersQuery).mockReturnValue({
      data: [{ id: "co1", name: "Flooring Ltd" }],
    } as unknown as ReturnType<typeof useGetSuppliersQuery>);
    vi.mocked(useCreateProjectReportMutation).mockReturnValue([
      createSpy,
      { isLoading: false },
    ] as unknown as ReturnType<typeof useCreateProjectReportMutation>);
    vi.mocked(useExportProjectReportsPdfMutation).mockReturnValue([
      exportSpy,
      { isLoading: false },
    ] as unknown as ReturnType<typeof useExportProjectReportsPdfMutation>);
  });

  it("renders the page title", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: "Project Reports" }),
    ).toBeInTheDocument();
  });

  it("groups reports into a card per client", () => {
    renderPage();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("shows the empty state when there are no reports", () => {
    setReports([]);
    renderPage();
    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  it("shows the loading state", () => {
    setReports([], true);
    renderPage();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("drills into a client and shows the project sheet with derived figures", async () => {
    renderPage();
    await userEvent.click(screen.getByText("Acme Corp"));
    // Project sheet
    expect(
      screen.getByRole("button", { name: "Tower Block" }),
    ).toBeInTheDocument();
    // profit = 10,000 * 20% = 2,000
    expect(screen.getByText("₪2,000")).toBeInTheDocument();
    // subcontractor payment = 10,000 - 2,000 - 0 = 8,000 (shown on the sheet
    // and again in the client-level "Total Sub Payments" header)
    expect(screen.getByText("Bob the Builder")).toBeInTheDocument();
    expect(screen.getAllByText("₪8,000").length).toBeGreaterThanOrEqual(1);
  });

  it("sums the total subcontractor payments for the selected client", async () => {
    renderPage();
    await userEvent.click(screen.getByText("Acme Corp"));
    expect(screen.getByText(/Total Sub Payments/)).toBeInTheDocument();
  });

  it("computes the inline profit simulator for the client", async () => {
    renderPage();
    await userEvent.click(screen.getByText("Acme Corp"));
    // Enter a 10% simulated margin -> profit 1,000, sub payment 9,000.
    // The inline simulator is the only number input in the detail view.
    const marginInput = screen.getByRole("spinbutton");
    await userEvent.type(marginInput, "10");
    expect(screen.getByText("₪1,000")).toBeInTheDocument();
    expect(screen.getByText("₪9,000")).toBeInTheDocument();
  });

  it("labels each income entry with its own tag", async () => {
    renderPage();
    await userEvent.click(screen.getByText("Acme Corp"));
    expect(screen.getByText("Shell")).toBeInTheDocument();
    expect(screen.getByText("Finishing")).toBeInTheDocument();
  });

  it("exports one report at a time, identified by its own id", async () => {
    renderPage();
    await userEvent.click(screen.getByText("Acme Corp"));
    await userEvent.click(screen.getByRole("button", { name: "Export PDF" }));

    await userEvent.type(
      screen.getByLabelText("Approved For"),
      "Shell + finishing",
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(exportSpy).toHaveBeenCalledWith({
      projectReportId: "r1",
      approvedFor: "Shell + finishing",
      lang: "en",
    });
  });

  it("opens the add-report modal", async () => {
    renderPage();
    await userEvent.click(screen.getAllByRole("button", { name: "+ Add" })[0]);
    expect(
      screen.getByRole("heading", { name: "Add Project Reports" }),
    ).toBeInTheDocument();
  });

  // T13 — total income per client, beside the existing subcontractor total.
  describe("client income total", () => {
    it("shows total income beside total subcontractor payments in the header", async () => {
      renderPage();
      await userEvent.click(screen.getByText("Acme Corp"));

      // Scoped to the client header — "Total Income" also labels a tile row, so
      // a page-wide query would match either and prove nothing about placement.
      const subcontractorTotal = screen.getByText(/Total Sub Payments/);
      const header = subcontractorTotal.closest("div")?.parentElement;
      expect(header).not.toBeNull();
      expect(within(header!).getByText(/Total Income/)).toBeInTheDocument();
    });

    it("totals income across the client's reports for the month", async () => {
      setReports([
        ...mockReports,
        {
          id: "r2",
          date: "2025-03-01",
          project: {
            id: "p2",
            name: "Riverside",
            client: { id: "c1", name: "Acme Corp" },
          },
          subcontractor: { id: "s1", name: "Bob the Builder" },
          totalIncome: 5000,
          profitMargin: 20,
          supplierPayments: [],
          incomeEntries: [
            { id: "ie3", amount: 5000, incomeDate: "2025-03-10", tag: null },
          ],
        },
      ]);
      renderPage();
      await userEvent.click(screen.getByText("Acme Corp"));

      // 10000 + 5000, rendered with he-IL grouping.
      expect(screen.getByText("₪15,000")).toBeInTheDocument();
    });

    it("shows zero rather than blank when the client has no income", async () => {
      setReports([
        {
          ...mockReports[0],
          totalIncome: 0,
          incomeEntries: [],
        },
      ]);
      renderPage();
      await userEvent.click(screen.getByText("Acme Corp"));

      expect(screen.getAllByText("₪0").length).toBeGreaterThan(0);
    });
  });
});
