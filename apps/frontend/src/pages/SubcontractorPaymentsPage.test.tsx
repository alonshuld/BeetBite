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
  useGetSubcontractorPaymentTagsQuery: vi.fn(),
  useCreateSubcontractorPaymentMutation: vi.fn(),
  useUpdateSubcontractorPaymentMutation: vi.fn(),
  useDeleteSubcontractorPaymentMutation: vi.fn(),
}));
vi.mock("@/api/endpoints/project-report-exports", () => ({
  useExportProjectReportsPdfMutation: vi.fn(),
}));

import { useGetProjectReportsQuery } from "@/api/endpoints/project-reports";
import {
  useGetSubcontractorPaymentsQuery,
  useGetSubcontractorPaymentTagsQuery,
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
    corporationPayments: [],
  },
];

interface MockPayment {
  id: string;
  projectId: string;
  amount: number;
  isPaid: boolean;
  tag: string | null;
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
    tag: null,
    ...overrides,
  };
}

const updateSpy = vi.fn().mockReturnValue({ unwrap: vi.fn() });
const createSpy = vi
  .fn()
  .mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });
const deleteSpy = vi.fn().mockReturnValue({ unwrap: vi.fn() });
const exportSpy = vi
  .fn()
  .mockReturnValue({ unwrap: vi.fn().mockResolvedValue(new Blob()) });

function setPayments(value: unknown) {
  vi.mocked(useGetSubcontractorPaymentsQuery).mockReturnValue({
    data: value,
  } as unknown as ReturnType<typeof useGetSubcontractorPaymentsQuery>);
}

function setTags(tags: string[]) {
  vi.mocked(useGetSubcontractorPaymentTagsQuery).mockReturnValue({
    data: tags,
  } as unknown as ReturnType<typeof useGetSubcontractorPaymentTagsQuery>);
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
    setTags([]);
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
    expect(screen.getByText(/₪8,000/)).toBeInTheDocument();
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

  it("marking a project paid creates a payment for the full amount owed", async () => {
    renderPage();
    await openPanel();
    await userEvent.click(screen.getByTitle("Paid"));
    expect(createSpy).toHaveBeenCalledWith({
      subcontractorId: "s1",
      projectId: "p1",
      serviceDate: "2025-03-01",
      amount: 8000,
      tag: null,
    });
  });

  it("opens the inline partial-amount row", async () => {
    renderPage();
    await openPanel();
    await userEvent.click(screen.getByTitle("Partial"));
    expect(screen.getByPlaceholderText("0 – 8000")).toBeInTheDocument();
  });

  describe("tags", () => {
    it("renders the tag stored on an existing payment", async () => {
      setPayments(makePayments([makePayment({ tag: "Materials" })], 8000));
      renderPage();
      await openPanel();
      expect(screen.getByLabelText<HTMLInputElement>("Tag").value).toBe(
        "Materials",
      );
    });

    it("shows the subcontractor's tags on the sidebar card", () => {
      setPayments(makePayments([makePayment({ tag: "Materials" })], 8000));
      renderPage();
      const card = screen
        .getByText("Bob the Builder")
        .closest("button") as HTMLElement;
      expect(within(card).getByText("Materials")).toBeInTheDocument();
    });

    it("offers previously used tags as datalist suggestions", async () => {
      setTags(["Materials", "Labor"]);
      renderPage();
      await openPanel();
      const options = document.querySelectorAll("#payment-tags option");
      expect(Array.from(options).map((o) => o.getAttribute("value"))).toEqual([
        "Materials",
        "Labor",
      ]);
    });

    it("edits an existing payment's tag on blur without sending an amount", async () => {
      setPayments(makePayments([makePayment({ tag: "Materials" })], 8000));
      renderPage();
      await openPanel();

      const input = screen.getByLabelText("Tag");
      await userEvent.clear(input);
      await userEvent.type(input, "Labor");
      await userEvent.tab();

      expect(updateSpy).toHaveBeenCalledWith({ id: "i1", tag: "Labor" });
    });

    it("does not fire an update when the tag is left unchanged", async () => {
      setPayments(makePayments([makePayment({ tag: "Materials" })], 8000));
      renderPage();
      await openPanel();

      await userEvent.click(screen.getByLabelText("Tag"));
      await userEvent.tab();

      expect(updateSpy).not.toHaveBeenCalled();
    });

    it("sends the typed tag when marking a project paid", async () => {
      renderPage();
      await openPanel();

      await userEvent.type(screen.getByLabelText("Tag"), "Materials");
      await userEvent.click(screen.getByTitle("Paid"));

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({ tag: "Materials" }),
      );
    });

    it("keeps the existing tag when a paid project is re-marked paid", async () => {
      setPayments(makePayments([makePayment({ tag: "Materials" })], 8000));
      renderPage();
      await openPanel();

      await userEvent.click(screen.getByTitle("Paid"));

      // The payment is deleted and recreated, so the tag has to be carried over.
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({ tag: "Materials" }),
      );
    });
  });
});
