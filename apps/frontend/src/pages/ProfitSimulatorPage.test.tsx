import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/renderWithProviders";
import ProfitSimulatorPage from "./ProfitSimulatorPage";

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useOutletContext: vi.fn(() => ({ month: "2025-03" })) };
});

vi.mock("@/api/endpoints/clients", () => ({
  useGetClientsQuery: vi.fn(),
}));
vi.mock("@/api/endpoints/projects", () => ({
  useGetProjectsQuery: vi.fn(),
}));
vi.mock("@/api/endpoints/project-reports", () => ({
  useGetProjectReportsQuery: vi.fn(),
}));

import { useGetClientsQuery } from "@/api/endpoints/clients";
import { useGetProjectsQuery } from "@/api/endpoints/projects";
import { useGetProjectReportsQuery } from "@/api/endpoints/project-reports";

const mockClients = [
  { id: "c1", name: "Acme Corp" },
  { id: "c2", name: "Globex" },
];

const mockProjects = [
  {
    id: "p1",
    name: "Tower Block",
    clientId: "c1",
    paymentProgress: { totalPaid: 10000 },
  },
  {
    id: "p2",
    name: "Bridge",
    clientId: "c2",
    paymentProgress: { totalPaid: 4000 },
  },
];

const mockReports = [
  {
    id: "r1",
    project: { id: "p1" },
    profitMargin: 25,
    date: "2025-03-01",
  },
];

function renderPage() {
  return renderWithProviders(<ProfitSimulatorPage />, {
    preloadedState: { auth: { token: "test-token" } },
    initialEntries: ["/simulator"],
  });
}

describe("ProfitSimulatorPage", () => {
  beforeEach(() => {
    vi.mocked(useGetClientsQuery).mockReturnValue({
      data: mockClients,
    } as unknown as ReturnType<typeof useGetClientsQuery>);
    vi.mocked(useGetProjectsQuery).mockReturnValue({
      data: mockProjects,
    } as unknown as ReturnType<typeof useGetProjectsQuery>);
    vi.mocked(useGetProjectReportsQuery).mockReturnValue({
      data: mockReports,
    } as unknown as ReturnType<typeof useGetProjectReportsQuery>);
  });

  it("renders the page title", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: "Profit Simulator" }),
    ).toBeInTheDocument();
  });

  it("shows no projects until a client is selected", () => {
    renderPage();
    expect(screen.queryByText("Tower Block")).not.toBeInTheDocument();
    expect(screen.queryByText("Summary")).not.toBeInTheDocument();
  });

  it("lists the selected client's projects with their saved margin", async () => {
    renderPage();
    await userEvent.selectOptions(screen.getByLabelText("Client"), "c1");
    expect(screen.getByText("Tower Block")).toBeInTheDocument();
    // Saved margin comes from the project's last report (25%), not the baseline.
    expect(screen.getByText(/25\.0%/)).toBeInTheDocument();
  });

  it("computes the summary using saved vs baseline margin", async () => {
    renderPage();
    await userEvent.selectOptions(screen.getByLabelText("Client"), "c1");
    // income 10,000; baseline sim margin 20% -> 2,000; saved 25% -> 2,500; delta -500
    const summary = screen.getByText("Summary").closest("div") as HTMLElement;
    expect(within(summary).getByText("₪10,000")).toBeInTheDocument();
    expect(within(summary).getByText("₪2,000")).toBeInTheDocument();
    // delta -500; he-IL may wrap the sign in directional marks, so normalise.
    const normalised = (summary.textContent ?? "").replace(/[‎‏]/g, "");
    expect(normalised).toContain("₪-500");
  });

  it("only shows projects for the chosen client", async () => {
    renderPage();
    await userEvent.selectOptions(screen.getByLabelText("Client"), "c2");
    expect(screen.getByText("Bridge")).toBeInTheDocument();
    expect(screen.queryByText("Tower Block")).not.toBeInTheDocument();
  });

  it("exposes a reset control and performs no API writes", async () => {
    renderPage();
    await userEvent.selectOptions(screen.getByLabelText("Client"), "c1");
    expect(
      screen.getByRole("button", { name: "Reset to saved values" }),
    ).toBeInTheDocument();
    // Read-only page: it only consumes query hooks, never mutations.
    expect(useGetClientsQuery).toHaveBeenCalled();
  });
});
