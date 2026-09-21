import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithProviders } from "@/test/renderWithProviders";
import MonthlyIncomePage from "./MonthlyIncomePage";

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useOutletContext: vi.fn(() => ({ month: "2025-03" })) };
});

vi.mock("@/api/endpoints/income", () => ({
  useGetMonthlyIncomeQuery: vi.fn(),
}));

import { useGetMonthlyIncomeQuery } from "@/api/endpoints/income";

const mockItems = [
  {
    clientId: "c1",
    clientName: "Acme Corp",
    totalIncome: 5000,
    totalProfit: 1000,
    projects: [
      {
        projectId: "p1",
        projectName: "Tower Block",
        totalIncome: 5000,
        receivedIncome: 5000,
        pendingIncome: 0,
        profit: 1000,
      },
    ],
  },
  {
    clientId: "c2",
    clientName: "Globex",
    totalIncome: 3000,
    totalProfit: 600,
    projects: [
      {
        projectId: "p2",
        projectName: "Bridge",
        totalIncome: 3000,
        receivedIncome: 0,
        pendingIncome: 3000,
        profit: 600,
      },
    ],
  },
];

function setQuery(value: Partial<ReturnType<typeof useGetMonthlyIncomeQuery>>) {
  vi.mocked(useGetMonthlyIncomeQuery).mockReturnValue(
    value as unknown as ReturnType<typeof useGetMonthlyIncomeQuery>,
  );
}

function renderPage() {
  return renderWithProviders(<MonthlyIncomePage />, {
    preloadedState: { auth: { token: "test-token" } },
    initialEntries: ["/monthly-income"],
  });
}

describe("MonthlyIncomePage", () => {
  beforeEach(() => {
    setQuery({ data: mockItems, isLoading: false });
  });

  it("renders the page title", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: "Monthly Income" }),
    ).toBeInTheDocument();
  });

  it("renders a card per client", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: "Acme Corp" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Globex" })).toBeInTheDocument();
  });

  it("renders each project row inside its client card", () => {
    renderPage();
    expect(screen.getByText("Tower Block")).toBeInTheDocument();
    expect(screen.getByText("Bridge")).toBeInTheDocument();
  });

  it("renders the grand total summing all clients (income 8,000 / profit 1,600)", () => {
    renderPage();
    const totalRow = screen
      .getByText("Grand Total")
      .closest("div") as HTMLElement;
    expect(within(totalRow).getByText("₪8,000")).toBeInTheDocument();
    expect(within(totalRow).getByText("₪1,600")).toBeInTheDocument();
  });

  it("puts the grand total above the client list", () => {
    renderPage();
    const total = screen.getByText("Grand Total");
    const firstClient = screen.getByText("Acme Corp");
    // The month's totals lead the page, ahead of the per-client breakdown.
    expect(
      total.compareDocumentPosition(firstClient) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("shows the loading state", () => {
    setQuery({ data: [], isLoading: true });
    renderPage();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows the empty state when no income this month", () => {
    setQuery({ data: [], isLoading: false });
    renderPage();
    expect(
      screen.getByText("No income recorded this month"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Grand Total")).not.toBeInTheDocument();
  });
});
