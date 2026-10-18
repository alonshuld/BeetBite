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

const setReportPayment = vi.fn();
vi.mock("@/api/endpoints/income", () => ({
  useGetMonthlyIncomeQuery: vi.fn(),
  useSetReportPaymentMutation: () => [setReportPayment, { isLoading: false }],
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
    incomePaidAt: null,
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

// Tower Block: 5,000 + 900 VAT, both paid. Bridge: 3,000 + 540, income paid,
// VAT still owed. Annex: 2,000 + 360, nothing paid.
const tower = project({
  projectId: "p1",
  projectName: "Tower Block",
  requesterName: "Dana",
  totalIncome: 5000,
  incomePaidAt: "2025-03-05T00:00:00.000Z",
  vatPaidAt: "2025-03-05T00:00:00.000Z",
});
const bridge = project({
  projectId: "p2",
  projectName: "Bridge",
  requesterName: "Eli",
  totalIncome: 3000,
  incomePaidAt: "2025-03-10T00:00:00.000Z",
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
    incomePaid: 3000,
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
    setReportPayment.mockReset().mockResolvedValue({ data: undefined });
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
      expect(controlFigures("Income")).toEqual(["₪10,000", "₪8,000", "₪2,000"]);
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

    it("shows income and VAT as paid or not, each on its own", () => {
      renderPage();
      expect(
        screen.getByRole("button", {
          name: "Mark unpaid — Income excl. VAT — Bridge",
        }),
      ).toHaveAttribute("aria-pressed", "true");
      expect(
        screen.getByRole("button", { name: "Mark paid — VAT — Bridge" }),
      ).toHaveAttribute("aria-pressed", "false");
    });

    it("shows the day each part was paid", () => {
      renderPage();
      const cells = within(rowOf("Bridge")).getAllByRole("cell");
      expect(
        within(cells[2]).getByRole("button", { name: "10/03/25" }),
      ).toBeInTheDocument();
      expect(
        within(cells[3]).queryByRole("button", { name: /\d\// }),
      ).toBeNull();
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

  describe("marking paid", () => {
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

      expect(setReportPayment).toHaveBeenCalledWith({
        reportId: "r-p2",
        vatPaidAt: "2025-04-15",
      });
    });

    it("opens the calendar on today", async () => {
      renderPage();
      await userEvent.click(
        screen.getByRole("button", {
          name: "Mark paid — Income excl. VAT — Annex",
        }),
      );
      expect(
        screen.getByLabelText("Payment date — Income excl. VAT — Annex"),
      ).toHaveValue(new Date().toISOString().slice(0, 10));
    });

    it("writes nothing when the calendar is cancelled", async () => {
      renderPage();
      await userEvent.click(
        screen.getByRole("button", {
          name: "Mark paid — Income excl. VAT — Annex",
        }),
      );
      await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

      expect(setReportPayment).not.toHaveBeenCalled();
      expect(
        screen.queryByLabelText("Payment date — Income excl. VAT — Annex"),
      ).toBeNull();
    });

    it("marks a paid part unpaid again", async () => {
      renderPage();
      await userEvent.click(
        screen.getByRole("button", {
          name: "Mark unpaid — Income excl. VAT — Bridge",
        }),
      );
      expect(setReportPayment).toHaveBeenCalledWith({
        reportId: "r-p2",
        incomePaidAt: null,
      });
    });

    it("corrects the day of a paid part", async () => {
      renderPage();
      const cell = within(rowOf("Bridge")).getAllByRole("cell")[2];
      await userEvent.click(
        within(cell).getByRole("button", { name: "10/03/25" }),
      );
      fireEvent.change(
        screen.getByLabelText("Payment date — Income excl. VAT — Bridge"),
        { target: { value: "2025-03-11" } },
      );
      await userEvent.click(
        screen.getByRole("button", {
          name: "Mark paid — Income excl. VAT — Bridge",
        }),
      );

      expect(setReportPayment).toHaveBeenCalledWith({
        reportId: "r-p2",
        incomePaidAt: "2025-03-11",
      });
    });

    it("marks income and VAT paid together with one button", async () => {
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

      expect(setReportPayment).toHaveBeenCalledWith({
        reportId: "r-p3",
        incomePaidAt: "2025-03-20",
        vatPaidAt: "2025-03-20",
      });
    });

    it("keeps the day of a part already paid when paying in full", async () => {
      renderPage();
      await userEvent.click(
        screen.getByRole("button", { name: "Paid in full incl. VAT — Bridge" }),
      );
      await userEvent.click(
        screen.getByRole("button", { name: "Paid in full incl. VAT — Bridge" }),
      );

      expect(setReportPayment).toHaveBeenCalledWith({
        reportId: "r-p2",
        vatPaidAt: new Date().toISOString().slice(0, 10),
      });
    });

    it("offers no full payment once both parts are paid", () => {
      renderPage();
      expect(
        screen.getByRole("button", {
          name: "Paid in full incl. VAT — Tower Block",
        }),
      ).toBeDisabled();
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
