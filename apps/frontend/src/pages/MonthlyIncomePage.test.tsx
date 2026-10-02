import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { renderWithProviders } from "@/test/renderWithProviders";
import MonthlyIncomePage from "./MonthlyIncomePage";

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useOutletContext: vi.fn(() => ({ month: "2025-03" })) };
});

vi.mock("@/api/endpoints/income", () => ({
  useGetMonthlyIncomeQuery: vi.fn(),
}));

const updateIncomeEntry = vi.fn();
vi.mock("@/api/endpoints/project-reports", () => ({
  useUpdateIncomeEntryMutation: () => [updateIncomeEntry, { isLoading: false }],
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
        incomeEntries: [
          {
            id: "e1",
            amount: 5000,
            incomeDate: "2025-03-12T00:00:00.000Z",
            tag: null,
          },
        ],
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
        incomeEntries: [
          { id: "e2", amount: 1000, incomeDate: null, tag: "Frame" },
          {
            id: "e3",
            amount: 2000,
            incomeDate: "2025-03-20T00:00:00.000Z",
            tag: null,
          },
        ],
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
    updateIncomeEntry.mockReset();
    updateIncomeEntry.mockReturnValue({ unwrap: () => Promise.resolve({}) });
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

  it("shows a single-entry project's status and date on the project row", () => {
    renderPage();
    const row = screen.getByText("Tower Block").closest("tr") as HTMLElement;
    expect(within(row).getByText("Received")).toBeInTheDocument();
    expect(within(row).getByLabelText("Income Date – Tower Block")).toHaveValue(
      "2025-03-12",
    );
  });

  it("lists each entry of a multi-entry project with its own status", () => {
    renderPage();
    const projectRow = screen.getByText("Bridge").closest("tr") as HTMLElement;
    // The project row sums what is still outstanding.
    expect(within(projectRow).getByText(/Pending/)).toHaveTextContent("₪3,000");

    const tagged = screen.getByText("Frame").closest("tr") as HTMLElement;
    expect(within(tagged).getByText("Pending")).toBeInTheDocument();
    expect(
      within(tagged).getByLabelText("Income Date – Bridge – Frame"),
    ).toHaveValue("");

    const untagged = screen
      .getByText("Client Income")
      .closest("tr") as HTMLElement;
    expect(within(untagged).getByText("Received")).toBeInTheDocument();
    expect(within(untagged).getByText("₪2,000")).toBeInTheDocument();
  });

  it("saves a new payment date on blur", () => {
    renderPage();
    const input = screen.getByLabelText("Income Date – Bridge – Frame");
    fireEvent.change(input, { target: { value: "2025-03-25" } });
    expect(updateIncomeEntry).not.toHaveBeenCalled();
    fireEvent.blur(input);
    expect(updateIncomeEntry).toHaveBeenCalledWith({
      id: "e2",
      incomeDate: "2025-03-25",
    });
  });

  it("marks income pending again when its date is cleared", () => {
    renderPage();
    const input = screen.getByLabelText("Income Date – Tower Block");
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(updateIncomeEntry).toHaveBeenCalledWith({
      id: "e1",
      incomeDate: null,
    });
  });

  it("does not save when the date is left unchanged", () => {
    renderPage();
    fireEvent.blur(screen.getByLabelText("Income Date – Tower Block"));
    expect(updateIncomeEntry).not.toHaveBeenCalled();
  });
});
