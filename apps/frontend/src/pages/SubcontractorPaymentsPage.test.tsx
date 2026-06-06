import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/renderWithProviders";
import SubcontractorPaymentsPage from "./SubcontractorPaymentsPage";

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useOutletContext: vi.fn(() => ({ month: "2025-03" })) };
});

vi.mock("@/api/endpoints/project-reports", () => ({
  useGetProjectReportsQuery: vi.fn(),
}));
vi.mock("@/api/endpoints/subcontractor-payments", () => ({
  useGetSubcontractorPaymentsQuery: vi.fn(),
  useCreateSubcontractorPaymentMutation: vi.fn(),
  useUpdateSubcontractorPaymentMutation: vi.fn(),
}));

import { useGetProjectReportsQuery } from "@/api/endpoints/project-reports";
import {
  useGetSubcontractorPaymentsQuery,
  useCreateSubcontractorPaymentMutation,
  useUpdateSubcontractorPaymentMutation,
} from "@/api/endpoints/subcontractor-payments";

// One report: income 10,000, margin 20% (profit 2,000), no corp payments -> owed 8,000.
const mockReports = [
  {
    id: "r1",
    project: { id: "p1", name: "Tower Block" },
    subcontractor: { id: "s1", name: "Bob the Builder" },
    totalIncome: 10000,
    profitMargin: 20,
    corporationPayments: [],
  },
];

function makePayments(payments: unknown[], amountPaid: number) {
  return [
    {
      subcontractor: { id: "s1", name: "Bob the Builder" },
      amountPaid,
      payments,
    },
  ];
}

const updateSpy = vi.fn().mockReturnValue({ unwrap: vi.fn() });
const createSpy = vi
  .fn()
  .mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });

function setPayments(value: unknown) {
  vi.mocked(useGetSubcontractorPaymentsQuery).mockReturnValue({
    data: value,
  } as unknown as ReturnType<typeof useGetSubcontractorPaymentsQuery>);
}

function renderPage() {
  return renderWithProviders(<SubcontractorPaymentsPage />, {
    preloadedState: { auth: { token: "test-token" } },
    initialEntries: ["/subcontractor-payments"],
  });
}

describe("SubcontractorPaymentsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGetProjectReportsQuery).mockReturnValue({
      data: mockReports,
    } as unknown as ReturnType<typeof useGetProjectReportsQuery>);
    setPayments(makePayments([], 0));
    vi.mocked(useCreateSubcontractorPaymentMutation).mockReturnValue([
      createSpy,
      { isLoading: false },
    ] as unknown as ReturnType<typeof useCreateSubcontractorPaymentMutation>);
    vi.mocked(useUpdateSubcontractorPaymentMutation).mockReturnValue([
      updateSpy,
      { isLoading: false },
    ] as unknown as ReturnType<typeof useUpdateSubcontractorPaymentMutation>);
  });

  it("renders the page title", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: "Subcontractor Payments" }),
    ).toBeInTheDocument();
  });

  it("shows the empty state when there are no reports", () => {
    vi.mocked(useGetProjectReportsQuery).mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useGetProjectReportsQuery>);
    renderPage();
    expect(
      screen.getByText("No subcontractor reports this month"),
    ).toBeInTheDocument();
  });

  it("renders a card with the subcontractor name and amount owed", () => {
    renderPage();
    expect(screen.getByText("Bob the Builder")).toBeInTheDocument();
    expect(screen.getByText(/₪8,000/)).toBeInTheDocument();
  });

  it("shows Unpaid when there are no instalments", () => {
    renderPage();
    const card = screen.getByText("Bob the Builder").closest(
      "button",
    ) as HTMLElement;
    expect(within(card).getByText("Unpaid")).toBeInTheDocument();
  });

  it("shows Partial when every instalment is paid but the total is below owed", () => {
    setPayments(
      makePayments(
        [{ id: "i1", amount: 4000, isPaid: true, projectId: "p1" }],
        4000,
      ),
    );
    renderPage();
    const card = screen.getByText("Bob the Builder").closest(
      "button",
    ) as HTMLElement;
    expect(within(card).getByText("Partial")).toBeInTheDocument();
  });

  it("shows Partial when the total covers owed but an instalment is still unpaid", () => {
    setPayments(
      makePayments(
        [
          { id: "i1", amount: 8000, isPaid: false, projectId: "p1" },
          { id: "i2", amount: 1000, isPaid: true, projectId: "p1" },
        ],
        9000,
      ),
    );
    renderPage();
    const card = screen.getByText("Bob the Builder").closest(
      "button",
    ) as HTMLElement;
    expect(within(card).getByText("Partial")).toBeInTheDocument();
  });

  it("shows Paid only when all instalments are paid AND total >= owed", () => {
    setPayments(
      makePayments(
        [{ id: "i1", amount: 8000, isPaid: true, projectId: "p1" }],
        8000,
      ),
    );
    renderPage();
    const card = screen.getByText("Bob the Builder").closest(
      "button",
    ) as HTMLElement;
    expect(within(card).getByText("Paid")).toBeInTheDocument();
  });

  it("shows which project each instalment belongs to", async () => {
    setPayments(
      makePayments(
        [{ id: "i1", amount: 8000, isPaid: true, projectId: "p1" }],
        8000,
      ),
    );
    renderPage();
    await userEvent.click(screen.getByText("Bob the Builder"));
    // Detail panel lists the instalment with its project name.
    expect(screen.getByText("Payment Instalments")).toBeInTheDocument();
    expect(screen.getAllByText("Tower Block").length).toBeGreaterThan(0);
  });

  it("toggling an instalment fires an update with the flipped isPaid", async () => {
    setPayments(
      makePayments(
        [{ id: "i1", amount: 8000, isPaid: false, projectId: "p1" }],
        8000,
      ),
    );
    renderPage();
    await userEvent.click(screen.getByText("Bob the Builder"));
    const toggle = screen.getByRole("button", { name: "Unpaid" });
    await userEvent.click(toggle);
    expect(updateSpy).toHaveBeenCalledWith({ id: "i1", isPaid: true });
  });

  it("opens the add-instalment modal", async () => {
    renderPage();
    await userEvent.click(screen.getByText("Bob the Builder"));
    await userEvent.click(
      screen.getByRole("button", { name: /add instalment/i }),
    );
    expect(
      screen.getByRole("heading", { name: "Add Instalment" }),
    ).toBeInTheDocument();
  });
});
