import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/renderWithProviders";
import CorporationPaymentsPage from "./CorporationPaymentsPage";

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useOutletContext: vi.fn(() => ({ month: "2025-03" })) };
});

vi.mock("@/api/endpoints/corporation-payments", () => ({
  useGetCorporationPaymentsByMonthQuery: vi.fn(),
}));

import { useGetCorporationPaymentsByMonthQuery } from "@/api/endpoints/corporation-payments";

const mockData = {
  corporationsPayments: [
    {
      corporation: { id: "corp1", name: "Global Inc" },
      projectPayments: [
        {
          id: "pp1",
          projectReport: {
            id: "r1",
            projectId: "p1",
            projectName: "Tower Block",
          },
          amount: 5000,
          date: "2025-03-01",
        },
      ],
      total: 5000,
    },
    {
      corporation: { id: "corp2", name: "Local Ltd" },
      projectPayments: [
        {
          id: "pp2",
          projectReport: { id: "r2", projectId: "p2", projectName: "Bridge" },
          amount: 3000,
          date: "2025-03-15",
        },
      ],
      total: 3000,
    },
  ],
  total: 8000,
};

function renderCorporationPaymentsPage() {
  return renderWithProviders(<CorporationPaymentsPage />, {
    preloadedState: { auth: { token: "test-token" } },
    initialEntries: ["/corporation-payments"],
  });
}

describe("CorporationPaymentsPage", () => {
  beforeEach(() => {
    vi.mocked(useGetCorporationPaymentsByMonthQuery).mockReturnValue({
      data: mockData,
      isLoading: false,
    } as unknown as ReturnType<typeof useGetCorporationPaymentsByMonthQuery>);
  });

  it("renders page title", () => {
    renderCorporationPaymentsPage();
    expect(
      screen.getByRole("heading", { name: "Corporation Payments" }),
    ).toBeInTheDocument();
  });

  it("renders corporation rows", () => {
    renderCorporationPaymentsPage();
    expect(screen.getByText("Global Inc")).toBeInTheDocument();
    expect(screen.getByText("Local Ltd")).toBeInTheDocument();
  });

  it("renders grand total in footer", () => {
    renderCorporationPaymentsPage();
    expect(screen.getByText("Grand Total")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    vi.mocked(useGetCorporationPaymentsByMonthQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof useGetCorporationPaymentsByMonthQuery>);
    renderCorporationPaymentsPage();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows empty state when no payments", () => {
    vi.mocked(useGetCorporationPaymentsByMonthQuery).mockReturnValue({
      data: { corporationsPayments: [], total: 0 },
      isLoading: false,
    } as unknown as ReturnType<typeof useGetCorporationPaymentsByMonthQuery>);
    renderCorporationPaymentsPage();
    expect(
      screen.getByText(/No corporation payments for/i),
    ).toBeInTheDocument();
  });

  it("renders number of projects per corporation", () => {
    renderCorporationPaymentsPage();
    const cells = screen.getAllByText("1");
    expect(cells.length).toBeGreaterThanOrEqual(1);
  });
});
