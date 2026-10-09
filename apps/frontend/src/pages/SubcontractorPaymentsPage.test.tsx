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
  useChangeReportSubcontractorMutation: vi.fn(),
}));
vi.mock("@/api/endpoints/subcontractors", () => ({
  useGetSubcontractorsQuery: vi.fn(() => ({ data: [] })),
  useGetSubcontractorTeamsQuery: vi.fn(),
  useCreateSubcontractorTeamMutation: vi.fn(() => [vi.fn(), {}]),
  useUpdateSubcontractorTeamMutation: vi.fn(() => [vi.fn(), {}]),
  useDeleteSubcontractorTeamMutation: vi.fn(() => [vi.fn(), {}]),
}));
vi.mock("@/api/endpoints/subcontractor-payments", () => ({
  useGetSubcontractorPaymentsQuery: vi.fn(),
  useCreateSubcontractorPaymentMutation: vi.fn(),
  useUpdateSubcontractorPaymentMutation: vi.fn(),
  useDeleteSubcontractorPaymentMutation: vi.fn(),
}));
vi.mock("@/api/endpoints/project-report-exports", () => ({
  useExportProjectReportsPdfMutation: vi.fn(),
}));

import {
  useGetProjectReportsQuery,
  useChangeReportSubcontractorMutation,
} from "@/api/endpoints/project-reports";
import { useGetSubcontractorTeamsQuery } from "@/api/endpoints/subcontractors";
import {
  useGetSubcontractorPaymentsQuery,
  useCreateSubcontractorPaymentMutation,
  useUpdateSubcontractorPaymentMutation,
  useDeleteSubcontractorPaymentMutation,
} from "@/api/endpoints/subcontractor-payments";
import { useExportProjectReportsPdfMutation } from "@/api/endpoints/project-report-exports";

// One report: income 10,000, margin 20% (profit 2,000), no corp payments -> owed 8,000.
const mockReports = [
  {
    id: "r1",
    project: {
      id: "p1",
      name: "Tower Block",
      client: { id: "c1", name: "Acme Ltd." },
    },
    subcontractor: { id: "s1", name: "Bob the Builder" },
    totalIncome: 10000,
    profitMargin: 20,
    supplierPayments: [],
  },
];

interface MockPayment {
  id: string;
  projectId: string;
  amount: number;
  isPaid: boolean;
  /** Null for rows recorded before the column existed. */
  paymentDate: string | null;
  description: string | null;
}

function makePayments(payments: MockPayment[], amountPaid: number) {
  return [
    {
      subcontractor: { id: "s1", name: "Bob the Builder" },
      amountPaid,
      payments,
    },
  ];
}

function makePayment(overrides: Partial<MockPayment> = {}): MockPayment {
  return {
    id: "i1",
    projectId: "p1",
    amount: 8000,
    isPaid: true,
    paymentDate: null,
    description: null,
    ...overrides,
  };
}

const updateSpy = vi.fn().mockReturnValue({ unwrap: vi.fn() });
const createSpy = vi
  .fn()
  .mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });
const deleteSpy = vi.fn().mockReturnValue({ unwrap: vi.fn() });
const changeMemberSpy = vi.fn().mockResolvedValue({ data: undefined });
const exportSpy = vi
  .fn()
  .mockReturnValue({ unwrap: vi.fn().mockResolvedValue(new Blob()) });

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

/** Select the subcontractor so the projects table is rendered. */
async function openPanel() {
  await userEvent.click(screen.getByText("Bob the Builder"));
}

describe("SubcontractorPaymentsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGetProjectReportsQuery).mockReturnValue({
      data: mockReports,
    } as unknown as ReturnType<typeof useGetProjectReportsQuery>);
    setPayments(makePayments([], 0));
    vi.mocked(useGetSubcontractorTeamsQuery).mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useGetSubcontractorTeamsQuery>);
    vi.mocked(useChangeReportSubcontractorMutation).mockReturnValue([
      changeMemberSpy,
      { isLoading: false },
    ] as unknown as ReturnType<typeof useChangeReportSubcontractorMutation>);
    vi.mocked(useCreateSubcontractorPaymentMutation).mockReturnValue([
      createSpy,
      { isLoading: false },
    ] as unknown as ReturnType<typeof useCreateSubcontractorPaymentMutation>);
    vi.mocked(useUpdateSubcontractorPaymentMutation).mockReturnValue([
      updateSpy,
      { isLoading: false },
    ] as unknown as ReturnType<typeof useUpdateSubcontractorPaymentMutation>);
    vi.mocked(useDeleteSubcontractorPaymentMutation).mockReturnValue([
      deleteSpy,
      { isLoading: false },
    ] as unknown as ReturnType<typeof useDeleteSubcontractorPaymentMutation>);
    vi.mocked(useExportProjectReportsPdfMutation).mockReturnValue([
      exportSpy,
      { isLoading: false },
    ] as unknown as ReturnType<typeof useExportProjectReportsPdfMutation>);
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
    expect(screen.getByText(/Owed: ₪8,000/)).toBeInTheDocument();
  });

  it("shows Unpaid when there are no payments", () => {
    renderPage();
    const card = screen
      .getByText("Bob the Builder")
      .closest("button") as HTMLElement;
    expect(within(card).getByText("Unpaid")).toBeInTheDocument();
  });

  it("shows Partial when the amount paid is below the amount owed", () => {
    setPayments(makePayments([makePayment({ amount: 4000 })], 4000));
    renderPage();
    const card = screen
      .getByText("Bob the Builder")
      .closest("button") as HTMLElement;
    expect(within(card).getByText("Partial")).toBeInTheDocument();
  });

  it("shows Paid once the amount paid covers the amount owed", () => {
    setPayments(makePayments([makePayment()], 8000));
    renderPage();
    const card = screen
      .getByText("Bob the Builder")
      .closest("button") as HTMLElement;
    expect(within(card).getByText("Paid")).toBeInTheDocument();
  });

  it("lists the subcontractor's projects once a card is selected", async () => {
    setPayments(makePayments([makePayment()], 8000));
    renderPage();
    await openPanel();
    expect(screen.getAllByText("Tower Block").length).toBeGreaterThan(0);
  });

  it("marking a project paid asks for the date before recording anything", async () => {
    renderPage();
    await openPanel();
    await userEvent.click(screen.getByTitle("Paid"));

    // Nothing is written on the click itself — the row opens with the whole
    // outstanding balance filled in, waiting for the day it was paid.
    expect(createSpy).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText("0 – 8000")).toHaveValue(8000);

    const dateInput = screen.getByLabelText("Payment date");
    await userEvent.clear(dateInput);
    await userEvent.type(dateInput, "2025-03-28");
    await userEvent.click(screen.getByTitle("Save"));

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        subcontractorId: "s1",
        projectId: "p1",
        // The month being settled — unchanged by the new payment date.
        serviceDate: "2025-03-01",
        amount: 8000,
        paymentDate: "2025-03-28",
      }),
    );
  });

  it("marking a partly paid project paid records only what is left", async () => {
    setPayments(makePayments([makePayment({ amount: 3000 })], 3000));
    renderPage();
    await openPanel();
    await userEvent.click(screen.getByTitle("Paid"));

    expect(screen.getByPlaceholderText("0 – 5000")).toHaveValue(5000);
  });

  it("opens the inline partial-amount row", async () => {
    renderPage();
    await openPanel();
    await userEvent.click(screen.getByTitle("Partial"));
    expect(screen.getByPlaceholderText("0 – 8000")).toBeInTheDocument();
  });

  // The day the money moved, and what is still outstanding.
  describe("payment dates and balance", () => {
    it("shows the balance beside owed and paid", () => {
      setPayments(makePayments([makePayment({ amount: 3000 })], 3000));
      renderPage();

      expect(screen.getByText(/Owed: ₪8,000/)).toBeInTheDocument();
      expect(screen.getByText(/Paid: ₪3,000/)).toBeInTheDocument();
      expect(screen.getByText(/Balance: ₪5,000/)).toBeInTheDocument();
    });

    it("shows a zero paid amount on a card with no payments yet", () => {
      renderPage();

      expect(screen.getByText(/Paid: ₪0/)).toBeInTheDocument();
      expect(screen.getByText(/Balance: ₪8,000/)).toBeInTheDocument();
    });

    it("shows a zero balance once the card is fully paid", () => {
      setPayments(makePayments([makePayment({ amount: 8000 })], 8000));
      renderPage();

      expect(screen.getByText(/Balance: ₪0/)).toBeInTheDocument();
    });

    it("shows the amount already paid on each project row", async () => {
      setPayments(makePayments([makePayment({ amount: 3000 })], 3000));
      renderPage();
      await openPanel();

      expect(
        screen.getByRole("columnheader", { name: "Amount Paid" }),
      ).toBeInTheDocument();
      const row = screen.getByText("Tower Block").closest("tr") as HTMLElement;
      expect(within(row).getByText("₪8,000")).toBeInTheDocument();
      expect(within(row).getByText("₪3,000")).toBeInTheDocument();
    });

    it("shows a zero amount paid for a project with no payments", async () => {
      renderPage();
      await openPanel();

      const row = screen.getByText("Tower Block").closest("tr") as HTMLElement;
      expect(within(row).getByText("₪0")).toBeInTheDocument();
    });

    it("offers an editable payment date defaulting to today", async () => {
      renderPage();
      await openPanel();
      await userEvent.click(screen.getByTitle("Partial"));

      const dateInput = screen.getByLabelText("Payment date");
      expect(dateInput).toHaveValue(new Date().toISOString().slice(0, 10));
    });

    it("sends the date the user picked, not today", async () => {
      renderPage();
      await openPanel();
      await userEvent.click(screen.getByTitle("Partial"));

      const dateInput = screen.getByLabelText("Payment date");
      await userEvent.clear(dateInput);
      await userEvent.type(dateInput, "2025-03-19");
      await userEvent.type(screen.getByPlaceholderText("0 – 8000"), "2000");
      await userEvent.click(screen.getByTitle("Save"));

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 2000,
          paymentDate: "2025-03-19",
          // Still the month being settled, whatever day was picked.
          serviceDate: "2025-03-01",
        }),
      );
    });

    it("lists each recorded payment with its own date and amount", async () => {
      setPayments(
        makePayments(
          [
            makePayment({
              id: "pay-1",
              amount: 2000,
              paymentDate: "2025-03-05T00:00:00.000Z",
            }),
            makePayment({
              id: "pay-2",
              amount: 3000,
              paymentDate: "2025-03-19T00:00:00.000Z",
            }),
          ],
          5000,
        ),
      );
      renderPage();
      await openPanel();

      expect(screen.getByText("₪2,000")).toBeInTheDocument();
      expect(screen.getByText("₪3,000")).toBeInTheDocument();
      expect(screen.getByText(/5 Mar 2025/)).toBeInTheDocument();
      expect(screen.getByText(/19 Mar 2025/)).toBeInTheDocument();
    });

    it("says so for a payment recorded before dates existed", async () => {
      setPayments(
        makePayments([makePayment({ amount: 2000, paymentDate: null })], 2000),
      );
      renderPage();
      await openPanel();

      expect(screen.getByText("No date recorded")).toBeInTheDocument();
    });
  });

  // A month settled in instalments: each one is its own row, added, corrected
  // and removed on its own.
  describe("instalments", () => {
    it("adds an instalment beside the ones already recorded", async () => {
      setPayments(
        makePayments(
          [
            makePayment({
              id: "pay-1",
              amount: 2000,
              paymentDate: "2025-03-05T00:00:00.000Z",
            }),
          ],
          2000,
        ),
      );
      renderPage();
      await openPanel();

      await userEvent.click(screen.getByTitle("Partial"));
      await userEvent.type(screen.getByPlaceholderText("0 – 6000"), "1500");
      await userEvent.click(screen.getByTitle("Save"));

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 1500 }),
      );
      // The instalment already on record is untouched.
      expect(deleteSpy).not.toHaveBeenCalled();
    });

    it("deletes one instalment without touching the others", async () => {
      setPayments(
        makePayments(
          [
            makePayment({
              id: "pay-1",
              amount: 2000,
              paymentDate: "2025-03-05T00:00:00.000Z",
            }),
            makePayment({
              id: "pay-2",
              amount: 3000,
              paymentDate: "2025-03-19T00:00:00.000Z",
            }),
          ],
          5000,
        ),
      );
      renderPage();
      await openPanel();

      const secondItem = screen.getAllByRole("listitem")[1];
      await userEvent.click(within(secondItem).getByTitle("Delete"));

      expect(deleteSpy).toHaveBeenCalledTimes(1);
      expect(deleteSpy).toHaveBeenCalledWith("pay-2");
    });

    it("corrects the date on an instalment already recorded", async () => {
      setPayments(
        makePayments(
          [
            makePayment({
              id: "pay-1",
              amount: 2000,
              paymentDate: "2025-03-05T00:00:00.000Z",
            }),
          ],
          2000,
        ),
      );
      renderPage();
      await openPanel();

      await userEvent.click(screen.getByText("5 Mar 2025"));
      const dateInput = screen.getByLabelText("Payment date");
      expect(dateInput).toHaveValue("2025-03-05");

      await userEvent.clear(dateInput);
      await userEvent.type(dateInput, "2025-03-07");

      expect(updateSpy).toHaveBeenCalledWith({
        id: "pay-1",
        paymentDate: "2025-03-07",
      });
    });

    it("fills in a date that was never recorded", async () => {
      setPayments(
        makePayments([makePayment({ amount: 2000, paymentDate: null })], 2000),
      );
      renderPage();
      await openPanel();

      await userEvent.click(screen.getByText("No date recorded"));
      const dateInput = screen.getByLabelText("Payment date");
      await userEvent.clear(dateInput);
      await userEvent.type(dateInput, "2025-03-11");

      expect(updateSpy).toHaveBeenCalledWith({
        id: "i1",
        paymentDate: "2025-03-11",
      });
    });
  });

  // An optional free-text note per instalment: typed when recording it, shown
  // on its line, and editable in place like the date.
  describe("descriptions", () => {
    it("sends the description typed with a new instalment, trimmed", async () => {
      renderPage();
      await openPanel();
      await userEvent.click(screen.getByTitle("Partial"));

      await userEvent.type(screen.getByPlaceholderText("0 – 8000"), "2000");
      await userEvent.type(
        screen.getByPlaceholderText("Description (optional)"),
        "  Cheque #1042 ",
      );
      await userEvent.click(screen.getByTitle("Save"));

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 2000, description: "Cheque #1042" }),
      );
    });

    it("sends no description when the field is left blank", async () => {
      renderPage();
      await openPanel();
      await userEvent.click(screen.getByTitle("Partial"));

      await userEvent.type(screen.getByPlaceholderText("0 – 8000"), "2000");
      await userEvent.click(screen.getByTitle("Save"));

      const [body] = createSpy.mock.calls[0] as [Record<string, unknown>];
      expect(body.description).toBeUndefined();
    });

    it("shows the description on the instalment's line", async () => {
      setPayments(
        makePayments(
          [makePayment({ amount: 2000, description: "Cheque #1042" })],
          2000,
        ),
      );
      renderPage();
      await openPanel();

      const item = screen.getByRole("listitem");
      expect(within(item).getByText("Cheque #1042")).toBeInTheDocument();
    });

    it("adds a description to an instalment already recorded", async () => {
      setPayments(makePayments([makePayment({ amount: 2000 })], 2000));
      renderPage();
      await openPanel();

      // Nothing to edit or delete yet — only the add button.
      expect(screen.queryByTitle("Edit description")).not.toBeInTheDocument();
      expect(screen.queryByTitle("Delete description")).not.toBeInTheDocument();

      await userEvent.click(screen.getByTitle("Add description"));
      await userEvent.type(
        screen.getByLabelText("Description"),
        "Bank transfer",
      );
      await userEvent.click(screen.getByRole("button", { name: /Save/ }));

      expect(updateSpy).toHaveBeenCalledWith({
        id: "i1",
        description: "Bank transfer",
      });
    });

    it("edits a description through its edit button, saved by Save", async () => {
      setPayments(
        makePayments(
          [makePayment({ amount: 2000, description: "Cheque #1042" })],
          2000,
        ),
      );
      renderPage();
      await openPanel();

      await userEvent.click(screen.getByTitle("Edit description"));
      const input = screen.getByLabelText("Description");
      expect(input).toHaveValue("Cheque #1042");

      await userEvent.clear(input);
      await userEvent.type(input, "Cheque #1043");
      // Leaving the field is not saving it — only the Save button commits.
      await userEvent.tab();
      expect(updateSpy).not.toHaveBeenCalled();

      await userEvent.click(screen.getByRole("button", { name: /Save/ }));
      expect(updateSpy).toHaveBeenCalledWith({
        id: "i1",
        description: "Cheque #1043",
      });
    });

    it("saves with Enter too", async () => {
      setPayments(
        makePayments(
          [makePayment({ amount: 2000, description: "Cheque #1042" })],
          2000,
        ),
      );
      renderPage();
      await openPanel();

      await userEvent.click(screen.getByTitle("Edit description"));
      await userEvent.type(screen.getByLabelText("Description"), "!{Enter}");

      expect(updateSpy).toHaveBeenCalledWith({
        id: "i1",
        description: "Cheque #1042!",
      });
    });

    it("discards the edit on Cancel", async () => {
      setPayments(
        makePayments(
          [makePayment({ amount: 2000, description: "Cheque #1042" })],
          2000,
        ),
      );
      renderPage();
      await openPanel();

      await userEvent.click(screen.getByTitle("Edit description"));
      await userEvent.type(screen.getByLabelText("Description"), " edited");
      await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

      expect(updateSpy).not.toHaveBeenCalled();
      expect(screen.getByText("Cheque #1042")).toBeInTheDocument();
      expect(screen.queryByLabelText("Description")).not.toBeInTheDocument();
    });

    it("discards the edit on Escape", async () => {
      setPayments(
        makePayments(
          [makePayment({ amount: 2000, description: "Cheque #1042" })],
          2000,
        ),
      );
      renderPage();
      await openPanel();

      await userEvent.click(screen.getByTitle("Edit description"));
      await userEvent.type(screen.getByLabelText("Description"), " edited");
      await userEvent.keyboard("{Escape}");

      expect(updateSpy).not.toHaveBeenCalled();
      expect(screen.getByText("Cheque #1042")).toBeInTheDocument();
    });

    it("deletes the description, not the payment, with its own button", async () => {
      setPayments(
        makePayments(
          [makePayment({ amount: 2000, description: "Cheque #1042" })],
          2000,
        ),
      );
      renderPage();
      await openPanel();

      await userEvent.click(screen.getByTitle("Delete description"));

      expect(updateSpy).toHaveBeenCalledWith({ id: "i1", description: "" });
      expect(deleteSpy).not.toHaveBeenCalled();
    });
  });

  describe("teams", () => {
    // Bob and Dana work as a team. Bob took Tower Block (owed 8,000), Dana
    // took Harbour Flats: income 5,000 at 20% → owed 4,000.
    const teamReports = [
      mockReports[0],
      {
        id: "r2",
        project: {
          id: "p2",
          name: "Harbour Flats",
          client: { id: "c1", name: "Acme Ltd." },
        },
        subcontractor: { id: "s2", name: "Dana Works" },
        totalIncome: 5000,
        profitMargin: 20,
        supplierPayments: [],
      },
    ];
    const team = {
      id: "team-1",
      members: [
        { id: "s1", name: "Bob the Builder", companyNumber: "111111111" },
        { id: "s2", name: "Dana Works", companyNumber: "222222222" },
      ],
    };

    beforeEach(() => {
      vi.mocked(useGetProjectReportsQuery).mockReturnValue({
        data: teamReports,
      } as unknown as ReturnType<typeof useGetProjectReportsQuery>);
      vi.mocked(useGetSubcontractorTeamsQuery).mockReturnValue({
        data: [team],
      } as unknown as ReturnType<typeof useGetSubcontractorTeamsQuery>);
      setPayments([
        {
          subcontractor: { id: "s1", name: "Bob the Builder" },
          amountPaid: 3000,
          payments: [makePayment({ amount: 3000 })],
        },
      ]);
    });

    async function openTeam() {
      await userEvent.click(screen.getByText("Bob the Builder + Dana Works"));
    }

    it("shows the team as one card named after its members", () => {
      renderPage();

      expect(
        screen.getByText("Bob the Builder + Dana Works"),
      ).toBeInTheDocument();
      // No separate card per member.
      expect(screen.queryByText("Dana Works")).toBeInTheDocument();
      expect(
        screen.getAllByRole("button", { name: /Bob the Builder/ }),
      ).toHaveLength(1);
    });

    it("lists both members' projects with who took each", async () => {
      renderPage();
      await openTeam();

      const tower = screen.getByLabelText(/— Tower Block$/);
      const harbour = screen.getByLabelText(/— Harbour Flats$/);
      expect(tower).toHaveValue("s1");
      expect(harbour).toHaveValue("s2");
    });

    it("hands a project to the other member", async () => {
      renderPage();
      await openTeam();

      await userEvent.selectOptions(
        screen.getByLabelText(/— Harbour Flats$/),
        "s1",
      );

      expect(changeMemberSpy).toHaveBeenCalledWith({
        id: "r2",
        subcontractorId: "s1",
      });
    });

    it("locks the member once payments are recorded to them", async () => {
      renderPage();
      await openTeam();

      expect(screen.getByLabelText(/— Tower Block$/)).toBeDisabled();
      expect(screen.getByLabelText(/— Harbour Flats$/)).toBeEnabled();
    });

    it("shows totals per member and for the whole team", async () => {
      renderPage();
      await openTeam();

      const footer = screen.getByText("Team total").closest("tfoot")!;
      const rows = within(footer).getAllByRole("row");
      // Bob: owed 8,000, paid 3,000. Dana: owed 4,000, paid 0.
      expect(rows[0]).toHaveTextContent("Bob the Builder");
      expect(rows[0]).toHaveTextContent("₪8,000");
      expect(rows[0]).toHaveTextContent("₪3,000");
      expect(rows[1]).toHaveTextContent("Dana Works");
      expect(rows[1]).toHaveTextContent("₪4,000");
      expect(rows[2]).toHaveTextContent("₪12,000");
      expect(rows[2]).toHaveTextContent("₪3,000");
    });

    it("records a payment to the member who took the project", async () => {
      renderPage();
      await openTeam();

      const harbourRow = screen
        .getByLabelText(/— Harbour Flats$/)
        .closest("tr")!;
      await userEvent.click(within(harbourRow).getByTitle("Partial"));
      await userEvent.type(screen.getByPlaceholderText("0 – 4000"), "1000");
      await userEvent.click(screen.getByTitle("Save"));

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          subcontractorId: "s2",
          projectId: "p2",
          amount: 1000,
        }),
      );
    });
  });
});
