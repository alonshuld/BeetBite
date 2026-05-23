import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/renderWithProviders";
import IncomePage from "./IncomePage";

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useOutletContext: vi.fn(() => ({ month: "2025-03" })) };
});

vi.mock("@/api/endpoints/project-reports", () => ({
  useGetProjectReportsQuery: vi.fn(),
}));

import { useGetProjectReportsQuery } from "@/api/endpoints/project-reports";

const mockReports = [
  {
    id: "r1",
    date: "2025-03-01T00:00:00.000Z",
    income: 10000,
    profitMargin: 20,
    project: { id: "p1", name: "Tower Block" },
    subcontractor: { id: "s1", name: "Smith" },
  },
  {
    id: "r2",
    date: "2025-03-01T00:00:00.000Z",
    income: 5000,
    profitMargin: 10,
    project: { id: "p2", name: "Bridge Repair" },
    subcontractor: { id: "s2", name: "Jones" },
  },
];

function renderIncomePage() {
  return renderWithProviders(<IncomePage />, {
    preloadedState: { auth: { token: "test-token" } },
    initialEntries: ["/income"],
  });
}

describe("IncomePage", () => {
  beforeEach(() => {
    vi.mocked(useGetProjectReportsQuery).mockReturnValue({
      data: mockReports,
      isLoading: false,
    } as unknown as ReturnType<typeof useGetProjectReportsQuery>);
  });

  it("renders page title", () => {
    renderIncomePage();
    expect(
      screen.getByRole("heading", { name: "Monthly Income" }),
    ).toBeInTheDocument();
  });

  it("renders total income stat card", () => {
    renderIncomePage();
    expect(screen.getByText("Total Income")).toBeInTheDocument();
  });

  it("renders total profit stat card", () => {
    renderIncomePage();
    expect(screen.getAllByText("Total Profit").length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("renders project rows in table", () => {
    renderIncomePage();
    expect(screen.getByText("Tower Block")).toBeInTheDocument();
    expect(screen.getByText("Bridge Repair")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    vi.mocked(useGetProjectReportsQuery).mockReturnValue({
      data: [],
      isLoading: true,
    } as unknown as ReturnType<typeof useGetProjectReportsQuery>);
    renderIncomePage();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows empty state when no reports", () => {
    vi.mocked(useGetProjectReportsQuery).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useGetProjectReportsQuery>);
    renderIncomePage();
    expect(screen.getByText(/No project reports for/i)).toBeInTheDocument();
  });

  it("displays profit margin percentage in rows", () => {
    renderIncomePage();
    expect(screen.getByText("20%")).toBeInTheDocument();
    expect(screen.getByText("10%")).toBeInTheDocument();
  });
});
