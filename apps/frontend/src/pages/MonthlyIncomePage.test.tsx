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
const setVatPayment = vi.fn();
const payInFull = vi.fn();
vi.mock("@/api/endpoints/income", () => ({
  useGetMonthlyIncomeQuery: vi.fn(),
  useCreateClientPaymentMutation: () => [createPayment, {}],
  useUpdateClientPaymentMutation: () => [updatePayment, {}],
  useDeleteClientPaymentMutation: () => [deletePayment, {}],
  useSetVatPaymentMutation: () => [setVatPayment, { isLoading: false }],
  usePayInFullMutation: () => [payInFull, { isLoading: false }],
}));

import { useGetMonthlyIncomeQuery } from "@/api/endpoints/income";

function project(
  overrides: Partial<MonthlyIncomeProject> &
    Pick<MonthlyIncomeProject, "projectId" | "projectName">,
): MonthlyIncomeProject {
  const totalIncome = overrides.totalIncome ?? 1000;
  const vatAmount = totalIncome * 0.18;
  return {
    reportId: `r-${overrides.projectId}`,
    requesterName: "Dana",
    totalIncome,
    vatPercentage: 18,
    vatAmount,
    totalWithVat: totalIncome + vatAmount,
    incomePaid: 0,
    payments: [],
    vatPaidAt: null,
    incomeEntries: [
      {
        id: `e-${overrides.projectId}`,
        amount: totalIncome,
        incomeDate: null,
        tag: null,
      },
    ],
    ...overrides,
  };
}

// Tower Block: 5,000 + 900 VAT, both paid. Bridge: 3,000 + 540, income paid
// in two parts so far 1,000 + 500, VAT still owed. Annex: 2,000 + 360, nothing
// paid.
const tower = project({
  projectId: "p1",
  projectName: "Tower Block",
  requesterName: "Dana",
  totalIncome: 5000,
  incomePaid: 5000,
  payments: [
    {
      id: "pay-1",
      projectReportId: "r-p1",
      amount: 5000,
      paymentDate: "2025-03-05T00:00:00.000Z",
    },
  ],
  vatPaidAt: "2025-03-05T00:00:00.000Z",
});
const bridge = project({
  projectId: "p2",
  projectName: "Bridge",
  requesterName: "Eli",
  totalIncome: 3000,
  incomePaid: 1500,
  payments: [
    {
      id: "pay-2",
      projectReportId: "r-p2",
      amount: 1000,
      paymentDate: "2025-03-10T00:00:00.000Z",
    },
    {
      id: "pay-3",
      projectReportId: "r-p2",
      amount: 500,
      paymentDate: "2025-03-18T00:00:00.000Z",
    },
  ],
  incomeEntries: [
    { id: "e2", amount: 1000, incomeDate: null, tag: "Frame" },
    { id: "e3", amount: 2000, incomeDate: null, tag: null },
  ],
});
// Typed with stray spaces and different case — still the same requester.
const annex = project({
  projectId: "p3",
  projectName: "Annex",
  requesterName: " dana ",
  totalIncome: 2000,
});

const mockItems: MonthlyIncomeItem[] = [
  {
    clientId: "c1",
    clientName: "Acme Corp",
    totalIncome: 5000,
    incomePaid: 5000,
    totalVat: 900,
    vatPaid: 900,
    totalWithVat: 5900,
    projects: [tower],
  },
  {
    clientId: "c2",
    clientName: "Globex",
    totalIncome: 5000,
    incomePaid: 1500,
    totalVat: 900,
    vatPaid: 0,
    totalWithVat: 5900,
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

/** The project names of a card's rows, in order. */
function projectsIn(card: HTMLElement) {
  return within(card)
    .getAllByRole("button", { name: /^Paid in full incl\. VAT — / })
    .map((b) => b.getAttribute("aria-label")!.split(" — ")[1]);
}

/** Total / Paid / Remaining of one control row at the top. */
function controlFigures(title: string) {
  const row = screen.getByRole("group", { name: title });
  const figure = (label: string) =>
    within(row).getByText(label).nextElementSibling?.textContent;
  return [figure("Total"), figure("Paid"), figure("Remaining")];
}

describe("MonthlyIncomePage", () => {
  beforeEach(() => {
    setQuery({ data: mockItems, isLoading: false });
    for (const fn of [
      createPayment,
      updatePayment,
      deletePayment,
      setVatPayment,
      payInFull,
    ])
      fn.mockReset().mockResolvedValue({ data: undefined });
  });

  it("is titled Turnover Summary", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: "Turnover Summary" }),
    ).toBeInTheDocument();
  });

  describe("control rows at the top", () => {
    it("controls income on its own: total, paid and what is left", () => {
      renderPage();
      expect(controlFigures("Income")).toEqual(["₪10,000", "₪6,500", "₪3,500"]);
    });

    it("controls VAT on a separate row", () => {
      renderPage();
      expect(controlFigures("VAT")).toEqual(["₪1,800", "₪900", "₪900"]);
    });

    it("shows what is left in red while something is owed", () => {
      renderPage();
      const row = screen.getByRole("group", { name: "VAT" });
      expect(within(row).getByText("Remaining").nextElementSibling).toHaveClass(
        "text-danger",
      );
    });

    it("keeps the month's totals while searching", async () => {
      renderPage();
      await userEvent.type(screen.getByRole("searchbox"), "bridge");
      expect(controlFigures("Income")[0]).toBe("₪10,000");
    });
  });

  describe("project row", () => {
    it("shows the requester next to the project, then income, VAT and total", () => {
      renderPage();
      expect(
        within(cardOf("Acme Corp"))
          .getAllByRole("columnheader")
          .map((h) => h.textContent),
      ).toEqual([
        "Project",
        "Requester",
        "Income excl. VAT",
        "VAT",
        "Total incl. VAT",
      ]);
      const cells = within(rowOf("Tower Block")).getAllByRole("cell");
      expect(cells[1]).toHaveTextContent("Dana");
      expect(cells[2]).toHaveTextContent("₪5,000");
      expect(cells[3]).toHaveTextContent("₪900");
      expect(cells[4]).toHaveTextContent("₪5,900");
    });

    it("has no profit column", () => {
      renderPage();
      expect(screen.queryByText("Profit")).toBeNull();
    });

    it("shows the income's status and the VAT's paid mark, each on its own", () => {
      renderPage();
      expect(
        screen.getByRole("button", {
          name: "Partial — Income excl. VAT — Bridge",
        }),
      ).toHaveAttribute("aria-pressed", "true");
      expect(
        within(rowOf("Bridge")).getByText(/Paid ₪1,500/),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Mark paid — VAT — Bridge" }),
      ).toHaveAttribute("aria-pressed", "false");
      expect(
        screen.getByRole("button", {
          name: "Paid — Income excl. VAT — Tower Block",
        }),
      ).toHaveAttribute("aria-pressed", "true");
      expect(
        screen.getByRole("button", {
          name: "Unpaid — Income excl. VAT — Annex",
        }),
      ).toHaveAttribute("aria-pressed", "true");
    });

    it("lists each income payment with its date and amount", () => {
      renderPage();
      const items = within(
        screen.getByRole("list", { name: "Income payments — Bridge" }),
      ).getAllByRole("listitem");
      expect(items).toHaveLength(2);
      expect(items[0]).toHaveTextContent("10 Mar 2025");
      expect(items[0]).toHaveTextContent("₪1,000");
      expect(items[1]).toHaveTextContent("18 Mar 2025");
      expect(items[1]).toHaveTextContent("₪500");
    });

    it("shows the day the VAT was paid", () => {
      renderPage();
      const cells = within(rowOf("Tower Block")).getAllByRole("cell");
      expect(
        within(cells[3]).getByRole("button", { name: "05/03/25" }),
      ).toBeInTheDocument();
    });

    it("warns when the month has no VAT rate yet", () => {
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

    it("lists each income entry of a multi-entry project under it", () => {
      renderPage();
      expect(
        (screen.getByText("Frame").closest("tr") as HTMLElement).textContent,
      ).toContain("₪1,000");
    });
  });

  describe("income payments", () => {
    it("records the income still owed in full, on the day chosen", async () => {
      renderPage();
      await userEvent.click(
        screen.getByRole("button", {
          name: "Paid — Income excl. VAT — Bridge",
        }),
      );
      expect(screen.getByLabelText("Amount (₪) — Bridge")).toHaveValue(1500);
      fireEvent.change(
        screen.getByLabelText("Payment date — Income excl. VAT — Bridge"),
        { target: { value: "2025-03-28" } },
      );
      await userEvent.click(screen.getByRole("button", { name: "Save" }));

      expect(createPayment).toHaveBeenCalledWith({
        projectReportId: "r-p2",
        amount: 1500,
        paymentDate: "2025-03-28",
      });
      expect(screen.queryByLabelText("Amount (₪) — Bridge")).toBeNull();
    });

    it("records a partial payment typed by the user, dated today by default", async () => {
      renderPage();
      await userEvent.click(
        screen.getByRole("button", {
          name: "Partial — Income excl. VAT — Annex",
        }),
      );
      await userEvent.type(
        screen.getByLabelText("Amount (₪) — Annex"),
        "750.5",
      );
      await userEvent.click(screen.getByRole("button", { name: "Save" }));

      expect(createPayment).toHaveBeenCalledWith({
        projectReportId: "r-p3",
        amount: 750.5,
        paymentDate: new Date().toISOString().slice(0, 10),
      });
    });

    it("does not save without an amount", async () => {
      renderPage();
      await userEvent.click(
        screen.getByRole("button", {
          name: "Partial — Income excl. VAT — Annex",
        }),
      );
      await userEvent.click(screen.getByRole("button", { name: "Save" }));

      expect(createPayment).not.toHaveBeenCalled();
    });

    it("keeps the row open when the server refuses the payment", async () => {
      createPayment.mockResolvedValue({ error: { status: 400 } });
      renderPage();
      await userEvent.click(
        screen.getByRole("button", {
          name: "Partial — Income excl. VAT — Annex",
        }),
      );
      await userEvent.type(screen.getByLabelText("Amount (₪) — Annex"), "9999");
      await userEvent.click(screen.getByRole("button", { name: "Save" }));

      expect(screen.getByLabelText("Amount (₪) — Annex")).toHaveValue(9999);
    });

    it("offers no full payment once the income is settled", () => {
      renderPage();
      expect(
        screen.getByRole("button", {
          name: "Paid — Income excl. VAT — Tower Block",
        }),
      ).toBeDisabled();
    });

    it("deletes one payment", async () => {
      renderPage();
      const list = screen.getByRole("list", {
        name: "Income payments — Bridge",
      });
      await userEvent.click(
        within(within(list).getAllByRole("listitem")[1]).getByRole("button", {
          name: "Delete",
        }),
      );
      expect(deletePayment).toHaveBeenCalledWith("pay-3");
    });

    it("marking the income unpaid removes all its payments", async () => {
      renderPage();
      await userEvent.click(
        screen.getByRole("button", {
          name: "Unpaid — Income excl. VAT — Bridge",
        }),
      );
      expect(deletePayment.mock.calls).toEqual([["pay-2"], ["pay-3"]]);
    });

    it("corrects a payment's day when the picker loses focus", async () => {
      renderPage();
      const list = screen.getByRole("list", {
        name: "Income payments — Bridge",
      });
      await userEvent.click(
        within(list).getByRole("button", { name: "10 Mar 2025" }),
      );
      const input = within(list).getByLabelText("Payment date");
      fireEvent.change(input, { target: { value: "2025-03-12" } });
      expect(updatePayment).not.toHaveBeenCalled();
      fireEvent.blur(input);

      expect(updatePayment).toHaveBeenCalledWith({
        id: "pay-2",
        paymentDate: "2025-03-12",
      });
    });
  });

  describe("VAT", () => {
    it("marks the VAT paid on the day picked in the calendar", async () => {
      renderPage();
      await userEvent.click(
        screen.getByRole("button", { name: "Mark paid — VAT — Bridge" }),
      );
      fireEvent.change(screen.getByLabelText("Payment date — VAT — Bridge"), {
        target: { value: "2025-04-15" },
      });
      await userEvent.click(
        screen.getByRole("button", { name: "Mark paid — VAT — Bridge" }),
      );

      expect(setVatPayment).toHaveBeenCalledWith({
        reportId: "r-p2",
        vatPaidAt: "2025-04-15",
      });
    });

    it("opens the calendar on today, and writes nothing when cancelled", async () => {
      renderPage();
      await userEvent.click(
        screen.getByRole("button", { name: "Mark paid — VAT — Annex" }),
      );
      expect(screen.getByLabelText("Payment date — VAT — Annex")).toHaveValue(
        new Date().toISOString().slice(0, 10),
      );
      await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

      expect(setVatPayment).not.toHaveBeenCalled();
    });

    it("marks the VAT unpaid again", async () => {
      renderPage();
      await userEvent.click(
        screen.getByRole("button", { name: "Mark unpaid — VAT — Tower Block" }),
      );
      expect(setVatPayment).toHaveBeenCalledWith({
        reportId: "r-p1",
        vatPaidAt: null,
      });
    });
  });

  describe("paid in full incl. VAT", () => {
    it("settles the income and the VAT on one day", async () => {
      renderPage();
      await userEvent.click(
        screen.getByRole("button", { name: "Paid in full incl. VAT — Annex" }),
      );
      fireEvent.change(screen.getByLabelText("Payment date — Annex"), {
        target: { value: "2025-03-20" },
      });
      await userEvent.click(
        screen.getByRole("button", { name: "Paid in full incl. VAT — Annex" }),
      );

      expect(payInFull).toHaveBeenCalledWith({
        reportId: "r-p3",
        paymentDate: "2025-03-20",
      });
    });

    it("is not offered once the income and the VAT are both paid", () => {
      renderPage();
      expect(
        screen.getByRole("button", {
          name: "Paid in full incl. VAT — Tower Block",
        }),
      ).toBeDisabled();
      expect(
        screen.getByRole("button", { name: "Paid in full incl. VAT — Bridge" }),
      ).toBeEnabled();
    });
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
      expect(projectsIn(cardOf("Acme Corp"))).toEqual([
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
      expect(projectsIn(cardOf("Globex"))).toEqual(["Annex", "Bridge"]);
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
      expect(projectsIn(cardOf("Globex"))).toEqual(["Bridge"]);
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
  });

  describe("group by requester", () => {
    it("groups by requester, merging names typed differently", async () => {
      renderPage();
      await userEvent.click(screen.getByRole("button", { name: "Requester" }));

      expect(screen.getByRole("button", { name: "Requester" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(groupHeadings()).toEqual(["Dana", "Eli"]);
      // Tower Block (Acme) and Annex (Globex) both belong to Dana.
      expect(projectsIn(cardOf("Dana"))).toEqual(["Annex", "Tower Block"]);
      // 5,900 + 2,360 incl. VAT.
      expect(within(cardOf("Dana")).getByText("₪8,260")).toBeInTheDocument();
    });

    it("goes back to clients", async () => {
      renderPage();
      await userEvent.click(screen.getByRole("button", { name: "Requester" }));
      await userEvent.click(screen.getByRole("button", { name: "Client" }));

      expect(groupHeadings()).toEqual(["Acme Corp", "Globex"]);
    });
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
    expect(screen.queryByRole("group", { name: "Income" })).toBeNull();
  });
});
