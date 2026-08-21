import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/renderWithProviders";
import ProjectReportsPage from "./ProjectReportsPage";

const navigateSpy = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useOutletContext: vi.fn(() => ({ month: "2025-03" })),
    useParams: vi.fn(() => ({ id: "p1" })),
    useNavigate: vi.fn(() => navigateSpy),
  };
});

vi.mock("@/api/endpoints/project-reports", () => ({
  useGetProjectReportsQuery: vi.fn(),
  useGetProjectReportQuery: vi.fn(),
  useUpdateProjectReportMutation: vi.fn(),
  useCreateProjectReportMutation: vi.fn(),
  useAddIncomeEntryMutation: vi.fn(),
  useUpdateIncomeEntryMutation: vi.fn(),
  useDeleteIncomeEntryMutation: vi.fn(),
  useDeleteProjectReportMutation: vi.fn(),
}));
vi.mock("@/api/endpoints/corporation-payments", () => ({
  useCreateCorporationPaymentMutation: vi.fn(),
  useUpdateCorporationPaymentMutation: vi.fn(),
  useDeleteCorporationPaymentMutation: vi.fn(),
}));
vi.mock("@/api/endpoints/projects", () => ({ useGetProjectsQuery: vi.fn() }));
vi.mock("@/api/endpoints/subcontractors", () => ({
  useGetSubcontractorsQuery: vi.fn(),
}));
vi.mock("@/api/endpoints/corporations", () => ({
  useGetCorporationsQuery: vi.fn(),
}));
vi.mock("@/api/endpoints/subcontractor-payments", () => ({
  useGetSubcontractorPaymentsQuery: vi.fn(),
}));

import {
  useGetProjectReportsQuery,
  useGetProjectReportQuery,
  useUpdateProjectReportMutation,
  useCreateProjectReportMutation,
  useAddIncomeEntryMutation,
  useUpdateIncomeEntryMutation,
  useDeleteIncomeEntryMutation,
  useDeleteProjectReportMutation,
} from "@/api/endpoints/project-reports";
import {
  useCreateCorporationPaymentMutation,
  useUpdateCorporationPaymentMutation,
  useDeleteCorporationPaymentMutation,
} from "@/api/endpoints/corporation-payments";
import { useGetProjectsQuery } from "@/api/endpoints/projects";
import { useGetSubcontractorsQuery } from "@/api/endpoints/subcontractors";
import { useGetCorporationsQuery } from "@/api/endpoints/corporations";
import { useGetSubcontractorPaymentsQuery } from "@/api/endpoints/subcontractor-payments";

const mockProject = {
  id: "p1",
  name: "Tower Block",
  clientId: "c1",
  estimatedAmount: 100000,
  paymentProgress: { totalPaid: 25000 },
  description: null,
};

const mockListReport = { id: "r1", project: { id: "p1" } };

const mockDetail = {
  id: "r1",
  date: "2025-03-01",
  totalIncome: 10000,
  profitMargin: 20,
  profit: 2000,
  incomeEntries: [{ id: "ie1", amount: 10000, incomeDate: "2025-03-10" }],
  corporationPayments: [
    {
      id: "cp1",
      corporation: { id: "co1", name: "Flooring Ltd" },
      amount: 1500,
      vatPercentage: null,
      effectiveTotal: 1500,
    },
  ],
  subcontractor: { id: "s1", name: "Bob the Builder", payment: 6500 },
};

const deleteEntrySpy = vi.fn().mockReturnValue({ unwrap: vi.fn() });

function mut(spy = vi.fn().mockReturnValue({ unwrap: vi.fn() })) {
  return [spy, { isLoading: false }] as unknown as never;
}

function setDetail(detail: unknown) {
  vi.mocked(useGetProjectReportQuery).mockReturnValue({
    data: detail,
  } as unknown as ReturnType<typeof useGetProjectReportQuery>);
}

function setMonthlyPayments(data: unknown) {
  vi.mocked(useGetSubcontractorPaymentsQuery).mockReturnValue({
    data,
  } as unknown as ReturnType<typeof useGetSubcontractorPaymentsQuery>);
}

function setListReports(data: unknown) {
  vi.mocked(useGetProjectReportsQuery).mockReturnValue({
    data,
    isLoading: false,
  } as unknown as ReturnType<typeof useGetProjectReportsQuery>);
}

function renderPage() {
  return renderWithProviders(<ProjectReportsPage />, {
    preloadedState: { auth: { token: "test-token" } },
    initialEntries: ["/reports/projects/p1"],
  });
}

describe("ProjectReportsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setListReports([mockListReport]);
    setDetail(mockDetail);
    vi.mocked(useGetProjectsQuery).mockReturnValue({
      data: [mockProject],
    } as unknown as ReturnType<typeof useGetProjectsQuery>);
    vi.mocked(useGetSubcontractorsQuery).mockReturnValue({
      data: [{ id: "s1", name: "Bob the Builder" }],
    } as unknown as ReturnType<typeof useGetSubcontractorsQuery>);
    vi.mocked(useGetCorporationsQuery).mockReturnValue({
      data: [{ id: "co1", name: "Flooring Ltd" }],
    } as unknown as ReturnType<typeof useGetCorporationsQuery>);
    vi.mocked(useUpdateProjectReportMutation).mockReturnValue(mut());
    vi.mocked(useCreateProjectReportMutation).mockReturnValue(mut());
    vi.mocked(useAddIncomeEntryMutation).mockReturnValue(mut());
    vi.mocked(useUpdateIncomeEntryMutation).mockReturnValue(mut());
    vi.mocked(useDeleteIncomeEntryMutation).mockReturnValue(
      mut(deleteEntrySpy),
    );
    vi.mocked(useCreateCorporationPaymentMutation).mockReturnValue(mut());
    vi.mocked(useUpdateCorporationPaymentMutation).mockReturnValue(mut());
    vi.mocked(useDeleteCorporationPaymentMutation).mockReturnValue(mut());
    vi.mocked(useDeleteProjectReportMutation).mockReturnValue(mut());
    setMonthlyPayments([]);
  });

  it("renders the project name as the heading", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: "Tower Block" }),
    ).toBeInTheDocument();
  });

  it("renders estimated amount and total-paid stat cards", () => {
    renderPage();
    expect(screen.getByText("₪100,000")).toBeInTheDocument();
    expect(screen.getByText("₪25,000")).toBeInTheDocument();
  });

  it("shows the completion percentage (25,000 / 100,000 = 25%)", () => {
    renderPage();
    expect(screen.getByText("25%")).toBeInTheDocument();
  });

  it("renders the report panel with income, profit and subcontractor payment", () => {
    renderPage();
    expect(screen.getByText("₪10,000")).toBeInTheDocument();
    expect(screen.getByText("₪2,000")).toBeInTheDocument();
    expect(screen.getByText("Bob the Builder")).toBeInTheDocument();
    expect(screen.getByText("₪6,500")).toBeInTheDocument();
    expect(screen.getByText("Flooring Ltd")).toBeInTheDocument();
  });

  it("shows the subcontractor payment tag when the payment carries one", () => {
    setMonthlyPayments([
      {
        subcontractor: { id: "s1", name: "Bob the Builder" },
        amountPaid: 6500,
        payments: [
          {
            id: "i1",
            projectId: "p1",
            amount: 6500,
            isPaid: true,
            tag: "Materials",
          },
        ],
      },
    ]);
    renderPage();
    expect(screen.getByText("Materials")).toBeInTheDocument();
  });

  it("shows no tag when the payment has none", () => {
    setMonthlyPayments([
      {
        subcontractor: { id: "s1", name: "Bob the Builder" },
        amountPaid: 6500,
        payments: [
          { id: "i1", projectId: "p1", amount: 6500, isPaid: true, tag: null },
        ],
      },
    ]);
    renderPage();
    expect(screen.queryByText("Materials")).not.toBeInTheDocument();
  });

  it("shows the empty state when there is no report for the month", () => {
    setListReports([]);
    setDetail(undefined);
    renderPage();
    expect(screen.getByText("No report for this month")).toBeInTheDocument();
  });

  it("opens the edit modal prefilled when Edit is clicked", async () => {
    renderPage();
    // The report-level Edit button is the first one.
    await userEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    expect(
      screen.getByRole("heading", { name: "Edit Project Reports" }),
    ).toBeInTheDocument();
  });

  it("reveals the inline add-income form", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /add income/i }));
    // Two income amount inputs would appear (existing none in edit), at least the
    // inline new-entry save button shows.
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  it("fires delete when removing an income entry", async () => {
    renderPage();
    await userEvent.click(screen.getAllByRole("button", { name: "Remove" })[0]);
    expect(deleteEntrySpy).toHaveBeenCalledWith("ie1");
  });
});
