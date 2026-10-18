import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/renderWithProviders";
import MonthlyIncomePage from "./MonthlyIncomePage";
import type {
  MonthlyIncomeItem,
  MonthlyIncomeProject,
} from "@/api/endpoints/income";

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useOutletContext: vi.fn(() => ({ month: "2025-03" })) };
});

const createPayment = vi.fn();
const updatePayment = vi.fn();
const deletePayment = vi.fn();
const setIncomeVat = vi.fn();
vi.mock("@/api/endpoints/income", () => ({
  useGetMonthlyIncomeQuery: vi.fn(),
  useCreateClientPaymentMutation: () => [createPayment, {}],
  useUpdateClientPaymentMutation: () => [updatePayment, {}],
  useDeleteClientPaymentMutation: () => [deletePayment, {}],
  useSetIncomeVatMutation: () => [setIncomeVat, { isLoading: false }],
}));

import { useGetMonthlyIncomeQuery } from "@/api/endpoints/income";

function project(
  overrides: Partial<MonthlyIncomeProject> &
    Pick<MonthlyIncomeProject, "projectId" | "projectName">,
): MonthlyIncomeProject {
  const totalIncome = overrides.totalIncome ?? 1000;
  return {
    reportId: `r-${overrides.projectId}`,
    requesterName: "Dana",
    totalIncome,
    incomeIncludesVat: false,
    vatPercentage: null,
    vatAmount: 0,
    totalWithVat: totalIncome,
    receivedIncome: 0,
    pendingIncome: totalIncome,
    profit: totalIncome / 10,
    incomeEntries: [
      {
        id: `e-${overrides.projectId}`,
        amount: totalIncome,
        incomeDate: null,
        tag: null,
      },
    ],
    payments: [],
    ...overrides,
  };
}

// Tower Block: 5,000 + 18% VAT = 5,900, paid in full in two payments.
// Bridge: 3,000, no VAT, 1,000 paid. Annex: 2,000, nothing paid.
const tower = project({
  projectId: "p1",
  projectName: "Tower Block",
  requesterName: "Dana",
  totalIncome: 5000,
  incomeIncludesVat: true,
  vatPercentage: 18,
  vatAmount: 900,
  totalWithVat: 5900,
  receivedIncome: 5900,
  pendingIncome: 0,
  profit: 1000,
  payments: [
    {
      id: "pay-1",
      projectReportId: "r-p1",
      amount: 3000,
      paymentDate: "2025-03-05T00:00:00.000Z",
    },
    {
      id: "pay-2",
      projectReportId: "r-p1",
      amount: 2900,
      paymentDate: "2025-03-19T00:00:00.000Z",
    },
  ],
});
const bridge = project({
  projectId: "p2",
  projectName: "Bridge",
  requesterName: "Eli",
  totalIncome: 3000,
  receivedIncome: 1000,
  pendingIncome: 2000,
  profit: 600,
  incomeEntries: [
    { id: "e2", amount: 1000, incomeDate: null, tag: "Frame" },
    { id: "e3", amount: 2000, incomeDate: null, tag: null },
  ],
  payments: [
    {
      id: "pay-3",
      projectReportId: "r-p2",
      amount: 1000,
      paymentDate: "2025-03-10T00:00:00.000Z",
    },
  ],
});
// Typed with stray spaces and different case — still the same requester.
const annex = project({
  projectId: "p3",
  projectName: "Annex",
  requesterName: " dana ",
  totalIncome: 2000,
  profit: 400,
});

const mockItems: MonthlyIncomeItem[] = [
  {
    clientId: "c1",
    clientName: "Acme Corp",
    totalIncome: 5000,
    totalVat: 900,
    totalWithVat: 5900,
    totalReceived: 5900,
    totalProfit: 1000,
    projects: [tower],
  },
  {
    clientId: "c2",
    clientName: "Globex",
    totalIncome: 5000,
    totalVat: 0,
    totalWithVat: 5000,
    totalReceived: 1000,
    totalProfit: 1000,
    projects: [bridge, annex],
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
    initialEntries: ["/income"],
  });
}

function groupHeadings() {
  return screen
    .queryAllByRole("heading", { level: 2 })
    .map((h) => h.textContent);
}

function rowOf(projectName: string) {
  return screen.getByText(projectName).closest("tr") as HTMLElement;
}

function cardOf(heading: string) {
  return screen
    .getByRole("heading", { name: heading })
    .closest("div.rounded-lg") as HTMLElement;
}

describe("MonthlyIncomePage", () => {
  beforeEach(() => {
    setQuery({ data: mockItems, isLoading: false });
    for (const fn of [
      createPayment,
      updatePayment,
      deletePayment,
      setIncomeVat,
    ])
      fn.mockReset().mockResolvedValue({ data: {} });
  });

  it("is titled Turnover Summary", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: "Turnover Summary" }),
    ).toBeInTheDocument();
  });

  describe("alphabetical order", () => {
    /** A client with one minimal project per name. */
    function client(id: string, name: string, projects: string[]) {
      return {
        ...mockItems[1],
        clientId: id,
        clientName: name,
        projects: projects.map((projectName, i) =>
          project({ projectId: `${id}-p${i}`, projectName }),
        ),
      };
    }

    beforeEach(() => {
      setQuery({
        data: [
          client("c3", "Zeta Homes", ["Z1"]),
          client("c1", "Acme Corp", ["Tower Block", "Apartments", "Mall"]),
          client("c2", "Beta Build", ["B1"]),
        ],
        isLoading: false,
      });
    });

    it("lists the clients by name", () => {
      renderPage();
      expect(groupHeadings()).toEqual([
        "Acme Corp",
        "Beta Build",
        "Zeta Homes",
      ]);
    });

    it("lists each client's projects by name", () => {
      renderPage();
      const rows = within(cardOf("Acme Corp")).getAllByRole("row").slice(1);
      expect(rows.map((r) => r.firstElementChild?.textContent)).toEqual([
        "Apartments",
        "Mall",
        "Tower Block",
      ]);
    });
  });

  describe("search", () => {
    it("filters by group name, keeping all its projects", async () => {
      renderPage();
      await userEvent.type(screen.getByRole("searchbox"), "  GLOBEX ");

      expect(groupHeadings()).toEqual(["Globex"]);
      expect(screen.getByText("Bridge")).toBeInTheDocument();
      expect(screen.getByText("Annex")).toBeInTheDocument();
    });

    it("filters by project name", async () => {
      renderPage();
      await userEvent.type(screen.getByRole("searchbox"), "tower");

      expect(groupHeadings()).toEqual(["Acme Corp"]);
      expect(screen.queryByText("Bridge")).toBeNull();
    });

    it("finds a project by who ordered it", async () => {
      renderPage();
      await userEvent.type(screen.getByRole("searchbox"), "eli");

      expect(groupHeadings()).toEqual(["Globex"]);
      expect(screen.getByText("Bridge")).toBeInTheDocument();
      expect(screen.queryByText("Annex")).toBeNull();
    });

    it("says so when nothing matches, and restores everything when cleared", async () => {
      renderPage();
      const box = screen.getByRole("searchbox");
      await userEvent.type(box, "zzz");

      expect(groupHeadings()).toEqual([]);
      expect(screen.getByText("No results")).toBeInTheDocument();

      await userEvent.clear(box);
      expect(groupHeadings()).toEqual(["Acme Corp", "Globex"]);
    });

    it("keeps the month's grand total while filtering", async () => {
      renderPage();
      await userEvent.type(screen.getByRole("searchbox"), "bridge");

      const total = screen
        .getByText("Grand Total")
        .closest("div") as HTMLElement;
      expect(within(total).getByText("₪10,900")).toBeInTheDocument();
    });
  });

  it("renders the month's grand totals: price, VAT, total, received and profit", () => {
    renderPage();
    const total = screen.getByText("Grand Total").closest("div") as HTMLElement;
    const figure = (label: string) =>
      within(total).getByText(label).nextElementSibling?.textContent;

    expect(figure("Price")).toBe("₪10,000");
    expect(figure("VAT")).toBe("₪900");
    expect(figure("Total incl. VAT")).toBe("₪10,900");
    expect(figure("Received")).toBe("₪6,900");
    expect(figure("Profit")).toBe("₪2,000");
  });

  it("puts the grand total above the groups", () => {
    renderPage();
    const total = screen.getByText("Grand Total");
    const firstClient = screen.getByText("Acme Corp");
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

  describe("requester", () => {
    it("shows who ordered each project next to its name", () => {
      renderPage();
      const header = within(cardOf("Acme Corp")).getAllByRole("columnheader");
      expect(header.slice(0, 2).map((h) => h.textContent)).toEqual([
        "Project",
        "Requester",
      ]);
      const cells = within(rowOf("Tower Block")).getAllByRole("cell");
      expect(cells[1]).toHaveTextContent("Dana");
    });

    it("groups by requester on demand, merging names typed differently", async () => {
      renderPage();
      await userEvent.click(screen.getByRole("button", { name: "Requester" }));

      expect(screen.getByRole("button", { name: "Requester" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(groupHeadings()).toEqual(["Dana", "Eli"]);

      // Tower Block (Acme) and Annex (Globex) both belong to Dana.
      const dana = cardOf("Dana");
      expect(
        within(dana)
          .getAllByRole("checkbox")
          .map((box) => box.getAttribute("aria-label")),
      ).toEqual(["Include VAT — Annex", "Include VAT — Tower Block"]);
      // The column next to the project stays the requester.
      expect(within(dana).getAllByRole("columnheader")[1]).toHaveTextContent(
        "Requester",
      );
      expect(within(rowOf("Annex")).getAllByRole("cell")[1]).toHaveTextContent(
        "dana",
      );

      // Group totals: 5,900 + 2,000 owed, 5,900 received.
      expect(within(dana).getByText("₪7,900")).toBeInTheDocument();
    });

    it("goes back to clients", async () => {
      renderPage();
      await userEvent.click(screen.getByRole("button", { name: "Requester" }));
      await userEvent.click(screen.getByRole("button", { name: "Client" }));

      expect(groupHeadings()).toEqual(["Acme Corp", "Globex"]);
    });
  });

  describe("VAT", () => {
    it("shows price, VAT and the total the client pays on the row", () => {
      renderPage();
      const cells = within(rowOf("Tower Block")).getAllByRole("cell");
      expect(cells[2]).toHaveTextContent("₪5,000");
      expect(cells[3]).toHaveTextContent("₪900");
      expect(cells[4]).toHaveTextContent("₪5,900");
    });

    it("ticks the box for a month that carries VAT", () => {
      renderPage();
      expect(
        screen.getByRole("checkbox", { name: "Include VAT — Tower Block" }),
      ).toBeChecked();
      expect(
        screen.getByRole("checkbox", { name: "Include VAT — Bridge" }),
      ).not.toBeChecked();
    });

    it("saves the choice when the box is toggled", async () => {
      renderPage();
      await userEvent.click(
        screen.getByRole("checkbox", { name: "Include VAT — Bridge" }),
      );
      expect(setIncomeVat).toHaveBeenCalledWith({
        reportId: "r-p2",
        incomeIncludesVat: true,
      });

      await userEvent.click(
        screen.getByRole("checkbox", { name: "Include VAT — Tower Block" }),
      );
      expect(setIncomeVat).toHaveBeenCalledWith({
        reportId: "r-p1",
        incomeIncludesVat: false,
      });
    });

    it("warns when VAT is on but the month has no rate yet", () => {
      setQuery({
        data: [
          {
            ...mockItems[0],
            projects: [
              {
                ...tower,
                vatPercentage: null,
                vatAmount: 0,
                totalWithVat: 5000,
              },
            ],
          },
        ],
        isLoading: false,
      });
      renderPage();
      expect(
        within(rowOf("Tower Block")).getByRole("img", {
          name: /No VAT rate is set for this month/,
        }),
      ).toBeInTheDocument();
    });
  });

  describe("payments", () => {
    it("marks each row's status", () => {
      renderPage();
      expect(
        screen.getByRole("button", { name: "Paid — Tower Block" }),
      ).toHaveAttribute("aria-pressed", "true");
      expect(
        screen.getByRole("button", { name: "Partial — Bridge" }),
      ).toHaveAttribute("aria-pressed", "true");
      expect(
        screen.getByRole("button", { name: "Unpaid — Annex" }),
      ).toHaveAttribute("aria-pressed", "true");
    });

    it("lists each payment with its date and amount", () => {
      renderPage();
      const list = screen.getByRole("list", { name: "Payments — Tower Block" });
      const items = within(list).getAllByRole("listitem");
      expect(items).toHaveLength(2);
      expect(items[0]).toHaveTextContent("5 Mar 2025");
      expect(items[0]).toHaveTextContent("₪3,000");
      expect(items[1]).toHaveTextContent("19 Mar 2025");
      expect(items[1]).toHaveTextContent("₪2,900");
    });

    it("lists each income entry of a multi-entry project under it", () => {
      renderPage();
      expect(
        (screen.getByText("Frame").closest("tr") as HTMLElement).textContent,
      ).toContain("₪1,000");
      expect(
        (screen.getByText("Client Income").closest("tr") as HTMLElement)
          .textContent,
      ).toContain("₪2,000");
    });

    it("records the outstanding balance in full with the date chosen", async () => {
      renderPage();
      await userEvent.click(
        screen.getByRole("button", { name: "Paid — Bridge" }),
      );

      const amount = screen.getByLabelText("Amount (₪) — Bridge");
      expect(amount).toHaveValue(2000);
      const date = screen.getByLabelText("Payment date — Bridge");
      fireEvent.change(date, { target: { value: "2025-03-28" } });
      await userEvent.click(screen.getByRole("button", { name: "Save" }));

      expect(createPayment).toHaveBeenCalledWith({
        projectReportId: "r-p2",
        amount: 2000,
        paymentDate: "2025-03-28",
      });
      expect(screen.queryByLabelText("Amount (₪) — Bridge")).toBeNull();
    });

    it("records a partial payment typed by the user", async () => {
      renderPage();
      await userEvent.click(
        screen.getByRole("button", { name: "Partial — Annex" }),
      );
      await userEvent.type(
        screen.getByLabelText("Amount (₪) — Annex"),
        "750.5",
      );
      await userEvent.click(screen.getByRole("button", { name: "Save" }));

      expect(createPayment).toHaveBeenCalledWith(
        expect.objectContaining({ projectReportId: "r-p3", amount: 750.5 }),
      );
    });

    it("does not save without an amount", async () => {
      renderPage();
      await userEvent.click(
        screen.getByRole("button", { name: "Partial — Annex" }),
      );
      await userEvent.click(screen.getByRole("button", { name: "Save" }));

      expect(createPayment).not.toHaveBeenCalled();
    });

    it("keeps the row open when the server refuses the payment", async () => {
      createPayment.mockResolvedValue({ error: { status: 400 } });
      renderPage();
      await userEvent.click(
        screen.getByRole("button", { name: "Partial — Annex" }),
      );
      await userEvent.type(screen.getByLabelText("Amount (₪) — Annex"), "9999");
      await userEvent.click(screen.getByRole("button", { name: "Save" }));

      expect(screen.getByLabelText("Amount (₪) — Annex")).toHaveValue(9999);
    });

    it("offers no full payment once the month is settled", () => {
      renderPage();
      expect(
        screen.getByRole("button", { name: "Paid — Tower Block" }),
      ).toBeDisabled();
    });

    it("deletes one payment", async () => {
      renderPage();
      const list = screen.getByRole("list", { name: "Payments — Tower Block" });
      await userEvent.click(
        within(within(list).getAllByRole("listitem")[1]).getByRole("button", {
          name: "Delete",
        }),
      );
      expect(deletePayment).toHaveBeenCalledWith("pay-2");
    });

    it("marking a month unpaid removes all its payments", async () => {
      renderPage();
      await userEvent.click(
        screen.getByRole("button", { name: "Unpaid — Tower Block" }),
      );
      expect(deletePayment.mock.calls).toEqual([["pay-1"], ["pay-2"]]);
    });

    it("corrects a payment's date when the picker loses focus", async () => {
      renderPage();
      const list = screen.getByRole("list", { name: "Payments — Bridge" });
      await userEvent.click(
        within(list).getByRole("button", { name: "10 Mar 2025" }),
      );

      const input = within(list).getByLabelText("Payment date");
      fireEvent.change(input, { target: { value: "2025-03-12" } });
      expect(updatePayment).not.toHaveBeenCalled();
      fireEvent.blur(input);

      expect(updatePayment).toHaveBeenCalledWith({
        id: "pay-3",
        paymentDate: "2025-03-12",
      });
    });

    it("does not save a date left unchanged", async () => {
      renderPage();
      const list = screen.getByRole("list", { name: "Payments — Bridge" });
      await userEvent.click(
        within(list).getByRole("button", { name: "10 Mar 2025" }),
      );
      fireEvent.blur(within(list).getByLabelText("Payment date"));

      expect(updatePayment).not.toHaveBeenCalled();
    });
  });
});
