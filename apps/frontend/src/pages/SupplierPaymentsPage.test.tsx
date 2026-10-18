import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/renderWithProviders";
import SupplierPaymentsPage from "./SupplierPaymentsPage";

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useOutletContext: vi.fn(() => ({ month: "2025-03" })) };
});

vi.mock("@/api/endpoints/supplier-payments", () => ({
  useGetSupplierPaymentsByMonthQuery: vi.fn(),
  useSetSupplierPaymentIncludesVatMutation: vi.fn(),
  useSetSupplierPaymentPaidMutation: vi.fn(),
  useSetSupplierPaymentsPaidMutation: vi.fn(),
  useBatchCreateSupplierPaymentsMutation: vi.fn(),
  useUpdateSupplierPaymentMutation: vi.fn(),
  useDeleteSupplierPaymentMutation: vi.fn(),
}));
vi.mock("@/api/endpoints/suppliers", () => ({ useGetSuppliersQuery: vi.fn() }));
vi.mock("@/api/endpoints/project-reports", () => ({
  useGetProjectReportsQuery: vi.fn(),
}));
vi.mock("@/api/endpoints/vatRates", () => ({
  useGetResolvedVatRateQuery: vi.fn(),
}));

import {
  useGetSupplierPaymentsByMonthQuery,
  useSetSupplierPaymentIncludesVatMutation,
  useSetSupplierPaymentPaidMutation,
  useSetSupplierPaymentsPaidMutation,
  useBatchCreateSupplierPaymentsMutation,
  useUpdateSupplierPaymentMutation,
  useDeleteSupplierPaymentMutation,
} from "@/api/endpoints/supplier-payments";
import { useGetSuppliersQuery } from "@/api/endpoints/suppliers";
import { useGetProjectReportsQuery } from "@/api/endpoints/project-reports";
import { useGetResolvedVatRateQuery } from "@/api/endpoints/vatRates";

const mockData = {
  suppliersPayments: [
    {
      supplier: { id: "corp1", name: "Global Inc" },
      projectPayments: [
        {
          id: "pp1",
          projectReport: {
            id: "r1",
            projectId: "p1",
            projectName: "Tower Block",
          },
          amount: 5000,
          includesVat: false,
          vatPercentage: null,
          effectiveTotal: undefined,
          isFuture: true,
          date: "2025-03-01",
          description: null,
          isPaid: false,
        },
      ],
      total: 5000,
      totalPaid: 0,
    },
    {
      supplier: { id: "corp2", name: "Local Ltd" },
      projectPayments: [
        {
          id: "pp2",
          projectReport: { id: "r2", projectId: "p2", projectName: "Bridge" },
          amount: 3000,
          includesVat: false,
          vatPercentage: null,
          effectiveTotal: undefined,
          isFuture: true,
          date: "2025-03-15",
          description: null,
          isPaid: true,
        },
      ],
      total: 3000,
      totalPaid: 3000,
    },
  ],
  total: 8000,
};

/** A payment that carries VAT, at the 17% the backend derived for its month. */
const mockDataWithVat = {
  suppliersPayments: [
    {
      supplier: { id: "corp1", name: "Global Inc" },
      projectPayments: [
        {
          id: "pp1",
          projectReport: {
            id: "r1",
            projectId: "p1",
            projectName: "Tower Block",
          },
          amount: 5000,
          includesVat: true,
          vatPercentage: 17,
          effectiveTotal: 5850,
          isFuture: false,
          date: "2025-03-01",
          description: null,
          isPaid: false,
        },
      ],
      total: 5850,
      totalPaid: 0,
    },
  ],
  total: 5850,
};

function renderSupplierPaymentsPage() {
  return renderWithProviders(<SupplierPaymentsPage />, {
    preloadedState: { auth: { token: "test-token" } },
    initialEntries: ["/supplier-payments"],
  });
}

const setPaidSpy = vi.fn().mockResolvedValue({ data: {} });
const setIncludesVatSpy = vi.fn().mockResolvedValue({ data: {} });
const setAllPaidSpy = vi.fn().mockResolvedValue({ data: {} });
const batchSpy = vi.fn().mockResolvedValue({ data: [] });
const updateSpy = vi.fn().mockResolvedValue({ data: { id: "pp1" } });
const deleteSpy = vi.fn().mockResolvedValue({ data: undefined });

describe("SupplierPaymentsPage", () => {
  beforeEach(() => {
    vi.mocked(useGetSupplierPaymentsByMonthQuery).mockReturnValue({
      data: mockData,
      isLoading: false,
    } as unknown as ReturnType<typeof useGetSupplierPaymentsByMonthQuery>);
    vi.mocked(useSetSupplierPaymentIncludesVatMutation).mockReturnValue([
      setIncludesVatSpy,
      { isLoading: false },
    ] as unknown as ReturnType<
      typeof useSetSupplierPaymentIncludesVatMutation
    >);
    vi.mocked(useGetResolvedVatRateQuery).mockReturnValue({
      data: { percentage: 18 },
    } as unknown as ReturnType<typeof useGetResolvedVatRateQuery>);
    vi.mocked(useSetSupplierPaymentPaidMutation).mockReturnValue([
      setPaidSpy,
      { isLoading: false },
    ] as unknown as ReturnType<typeof useSetSupplierPaymentPaidMutation>);
    vi.mocked(useSetSupplierPaymentsPaidMutation).mockReturnValue([
      setAllPaidSpy,
      { isLoading: false },
    ] as unknown as ReturnType<typeof useSetSupplierPaymentsPaidMutation>);
    vi.mocked(useBatchCreateSupplierPaymentsMutation).mockReturnValue([
      batchSpy,
      { isLoading: false },
    ] as unknown as ReturnType<typeof useBatchCreateSupplierPaymentsMutation>);
    vi.mocked(useUpdateSupplierPaymentMutation).mockReturnValue([
      updateSpy,
      { isLoading: false },
    ] as unknown as ReturnType<typeof useUpdateSupplierPaymentMutation>);
    vi.mocked(useDeleteSupplierPaymentMutation).mockReturnValue([
      deleteSpy,
      { isLoading: false },
    ] as unknown as ReturnType<typeof useDeleteSupplierPaymentMutation>);
    vi.mocked(useGetSuppliersQuery).mockReturnValue({
      data: [{ id: "corp1", name: "Global Inc" }],
    } as unknown as ReturnType<typeof useGetSuppliersQuery>);
    vi.mocked(useGetProjectReportsQuery).mockReturnValue({
      data: [
        {
          id: "r1",
          project: { id: "p1", name: "Tower Block" },
          totalIncome: 100000,
          supplierPayments: [],
        },
        {
          id: "r2",
          project: { id: "p2", name: "Bridge" },
          totalIncome: 100000,
          supplierPayments: [],
        },
      ],
    } as unknown as ReturnType<typeof useGetProjectReportsQuery>);
  });

  it("renders page title", () => {
    renderSupplierPaymentsPage();
    expect(
      screen.getByRole("heading", { name: "Manpower / Supplier Payments" }),
    ).toBeInTheDocument();
  });

  it("renders supplier rows", () => {
    renderSupplierPaymentsPage();
    expect(screen.getByText("Global Inc")).toBeInTheDocument();
    expect(screen.getByText("Local Ltd")).toBeInTheDocument();
  });

  it("renders grand total in footer", () => {
    renderSupplierPaymentsPage();
    // The label and the figure now share one element, so match on the label
    // and assert the figure alongside it rather than on an exact text node.
    expect(screen.getByText(/Grand Total/)).toBeInTheDocument();
    expect(screen.getByText("₪8,000")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    vi.mocked(useGetSupplierPaymentsByMonthQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof useGetSupplierPaymentsByMonthQuery>);
    renderSupplierPaymentsPage();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows empty state when no payments", () => {
    vi.mocked(useGetSupplierPaymentsByMonthQuery).mockReturnValue({
      data: { suppliersPayments: [], total: 0 },
      isLoading: false,
    } as unknown as ReturnType<typeof useGetSupplierPaymentsByMonthQuery>);
    renderSupplierPaymentsPage();
    expect(
      screen.getByText(/No manpower \/ supplier payments for/i),
    ).toBeInTheDocument();
  });

  // FIXED: old test looked for count "1" per corp — page now shows a flat table
  // with one row per project payment; verify project names appear in the table.
  it("renders project name in each table row", () => {
    renderSupplierPaymentsPage();
    expect(screen.getByText("Tower Block")).toBeInTheDocument();
    expect(screen.getByText("Bridge")).toBeInTheDocument();
  });

  it("grand total shows ₪ prefix", () => {
    renderSupplierPaymentsPage();
    // grandTotal = 5000 + 3000 = 8000; ₪ appears on each row + total
    expect(screen.getAllByText(/₪/).length).toBeGreaterThan(0);
  });

  it("shows fractional amounts with exactly two decimals", () => {
    vi.mocked(useGetSupplierPaymentsByMonthQuery).mockReturnValue({
      data: {
        ...mockDataWithVat,
        suppliersPayments: [
          {
            ...mockDataWithVat.suppliersPayments[0],
            projectPayments: [
              {
                ...mockDataWithVat.suppliersPayments[0].projectPayments[0],
                amount: 1234.5,
                effectiveTotal: 1444.365,
              },
            ],
            total: 1444.365,
          },
        ],
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useGetSupplierPaymentsByMonthQuery>);
    renderSupplierPaymentsPage();

    expect(screen.getByText("₪1,234.50")).toBeInTheDocument();
    // The row total and the grand total both round to two places.
    expect(screen.getAllByText("₪1,444.37").length).toBeGreaterThan(1);
  });

  it("lists each supplier's projects in alphabetical order", () => {
    const base = mockData.suppliersPayments[0].projectPayments[0];
    vi.mocked(useGetSupplierPaymentsByMonthQuery).mockReturnValue({
      data: {
        suppliersPayments: [
          {
            ...mockData.suppliersPayments[0],
            projectPayments: ["Tower Block", "Apartments", "Mall"].map(
              (projectName, i) => ({
                ...base,
                id: `pp${i}`,
                projectReport: { ...base.projectReport, projectName },
              }),
            ),
          },
        ],
        total: 15000,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useGetSupplierPaymentsByMonthQuery>);
    renderSupplierPaymentsPage();

    const rows = within(screen.getByRole("table")).getAllByRole("row");
    // The first row is the header.
    expect(rows.slice(1).map((r) => r.firstElementChild?.textContent)).toEqual([
      "Apartments",
      "Mall",
      "Tower Block",
    ]);
  });

  describe("search", () => {
    it("filters suppliers by name, keeping their whole stack", async () => {
      renderSupplierPaymentsPage();
      await userEvent.type(screen.getByRole("searchbox"), "  local ");

      expect(
        screen.getByRole("heading", { name: "Local Ltd" }),
      ).toBeInTheDocument();
      expect(screen.getByText("Bridge")).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "Global Inc" })).toBeNull();
    });

    it("filters payments by project name", async () => {
      renderSupplierPaymentsPage();
      await userEvent.type(screen.getByRole("searchbox"), "tower");

      expect(screen.getByText("Tower Block")).toBeInTheDocument();
      expect(screen.queryByText("Bridge")).toBeNull();
      expect(screen.queryByRole("heading", { name: "Local Ltd" })).toBeNull();
    });

    it("filters payments by description", async () => {
      vi.mocked(useGetSupplierPaymentsByMonthQuery).mockReturnValue({
        data: {
          ...mockData,
          suppliersPayments: [
            {
              ...mockData.suppliersPayments[0],
              projectPayments: [
                {
                  ...mockData.suppliersPayments[0].projectPayments[0],
                  description: "Floor tiles",
                },
              ],
            },
            mockData.suppliersPayments[1],
          ],
        },
        isLoading: false,
      } as unknown as ReturnType<typeof useGetSupplierPaymentsByMonthQuery>);
      renderSupplierPaymentsPage();
      await userEvent.type(screen.getByRole("searchbox"), "tiles");

      expect(screen.getByText("Tower Block")).toBeInTheDocument();
      expect(screen.queryByText("Bridge")).toBeNull();
    });

    it("says so when nothing matches, and restores everything when cleared", async () => {
      renderSupplierPaymentsPage();
      const box = screen.getByRole("searchbox");
      await userEvent.type(box, "zzz");

      expect(screen.getByText("No results")).toBeInTheDocument();
      expect(screen.queryByText("Tower Block")).toBeNull();

      await userEvent.clear(box);
      expect(screen.getByText("Tower Block")).toBeInTheDocument();
      expect(screen.getByText("Bridge")).toBeInTheDocument();
    });

    it("keeps the month's grand total while filtering", async () => {
      renderSupplierPaymentsPage();
      await userEvent.type(screen.getByRole("searchbox"), "bridge");

      expect(screen.getByText("₪8,000")).toBeInTheDocument();
    });
  });

  // The percentage is never typed: it is the global rate for the payment's
  // month. The user only chooses whether a payment carries VAT.
  describe("VAT toggle", () => {
    function showPayments(data: unknown) {
      vi.mocked(useGetSupplierPaymentsByMonthQuery).mockReturnValue({
        data,
        isLoading: false,
      } as unknown as ReturnType<typeof useGetSupplierPaymentsByMonthQuery>);
    }

    it("ticks the box and shows the derived percentage when the payment includes VAT", () => {
      showPayments(mockDataWithVat);
      renderSupplierPaymentsPage();

      expect(
        screen.getByRole("checkbox", { name: /Include VAT — Tower Block/ }),
      ).toBeChecked();
      expect(screen.getByText("17%")).toBeInTheDocument();
    });

    it("leaves the box unticked, with no percentage, when the payment has no VAT", () => {
      renderSupplierPaymentsPage();

      expect(
        screen.getByRole("checkbox", { name: /Include VAT — Tower Block/ }),
      ).not.toBeChecked();
      // Only a bare figure such as "17%" — the column header also ends in %.
      expect(screen.queryByText(/^\d+(\.\d+)?%$/)).toBeNull();
    });

    it("offers no field to type a VAT amount or percentage", () => {
      showPayments(mockDataWithVat);
      renderSupplierPaymentsPage();

      expect(screen.queryByRole("spinbutton")).toBeNull();
      expect(screen.queryByRole("button", { name: "Save VAT" })).toBeNull();
    });

    it("shows the payment total including the derived VAT", () => {
      showPayments(mockDataWithVat);
      renderSupplierPaymentsPage();

      // ₪5,000 + 17% — the row's total, and the grand total that sums them.
      expect(screen.getAllByText("₪5,850").length).toBeGreaterThan(0);
    });

    it("turns VAT off, sending only the choice", async () => {
      showPayments(mockDataWithVat);
      renderSupplierPaymentsPage();

      await userEvent.click(
        screen.getByRole("checkbox", { name: /Include VAT — Tower Block/ }),
      );

      expect(setIncludesVatSpy).toHaveBeenCalledWith({
        id: "pp1",
        includesVat: false,
      });
    });

    it("turns VAT on, sending only the choice", async () => {
      renderSupplierPaymentsPage();

      await userEvent.click(
        screen.getByRole("checkbox", { name: /Include VAT — Tower Block/ }),
      );

      expect(setIncludesVatSpy).toHaveBeenCalledWith({
        id: "pp1",
        includesVat: true,
      });
    });

    // Ticked but nothing added would otherwise look like a 0% rate.
    it("flags a payment whose VAT is on but whose month has no rate yet", () => {
      showPayments({
        ...mockDataWithVat,
        suppliersPayments: [
          {
            ...mockDataWithVat.suppliersPayments[0],
            projectPayments: [
              {
                ...mockDataWithVat.suppliersPayments[0].projectPayments[0],
                vatPercentage: null,
                effectiveTotal: 5000,
              },
            ],
          },
        ],
      });
      renderSupplierPaymentsPage();

      expect(
        screen.getByRole("img", { name: /No VAT rate is set/ }),
      ).toBeInTheDocument();
    });
  });

  // The page is worked supplier by supplier, not as a flat list.
  describe("grouping and settlement", () => {
    it("renders one group per supplier rather than repeating the name per row", () => {
      renderSupplierPaymentsPage();

      expect(
        screen.getByRole("heading", { name: "Global Inc" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Local Ltd" }),
      ).toBeInTheDocument();
    });

    it("shows how much of each supplier's total is settled", () => {
      renderSupplierPaymentsPage();

      // Global Inc: nothing paid of ₪5,000. Local Ltd: all ₪3,000 paid.
      expect(screen.getByText(/₪0 paid of ₪5,000/)).toBeInTheDocument();
      expect(screen.getByText(/₪3,000 paid of ₪3,000/)).toBeInTheDocument();
    });

    it("ticks a single payment paid", async () => {
      renderSupplierPaymentsPage();

      await userEvent.click(
        screen.getByLabelText(/Paid — Tower Block/, { exact: false }),
      );

      expect(setPaidSpy).toHaveBeenCalledWith({ id: "pp1", isPaid: true });
    });

    // A stack of paperwork usually settles as one transfer.
    it("marks a whole supplier's stack paid from the group header", async () => {
      renderSupplierPaymentsPage();

      const [markAll] = screen.getAllByRole("button", {
        name: /Mark all paid/,
      });
      await userEvent.click(markAll);

      expect(setAllPaidSpy).toHaveBeenCalledWith({
        supplierId: "corp1",
        isPaid: true,
        month: "2025-03",
      });
    });

    it("offers to unmark a supplier whose stack is fully settled", () => {
      renderSupplierPaymentsPage();

      // Local Ltd is fully paid, so its action is the inverse.
      expect(
        screen.getByRole("button", { name: /Mark all unpaid/ }),
      ).toBeInTheDocument();
    });

    it("surfaces the description column", () => {
      renderSupplierPaymentsPage();

      expect(
        screen.getAllByRole("columnheader", { name: /Description/ }).length,
      ).toBeGreaterThan(0);
    });
  });

  describe("editing and deleting a payment", () => {
    beforeEach(() => {
      updateSpy.mockClear();
      deleteSpy.mockClear();
    });

    it("opens the edit form prefilled with the payment", async () => {
      renderSupplierPaymentsPage();

      await userEvent.click(
        screen.getByRole("button", { name: "Edit — Tower Block" }),
      );

      expect(
        screen.getByRole("dialog", { name: /Edit payment — Global Inc/ }),
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/Amount/)).toHaveValue(5000);
      expect(screen.getByLabelText(/^Date/)).toHaveValue("2025-03-01");
    });

    it("saves the corrected payment, keeping its supplier", async () => {
      renderSupplierPaymentsPage();

      await userEvent.click(
        screen.getByRole("button", { name: "Edit — Tower Block" }),
      );
      const amount = screen.getByLabelText(/Amount/);
      await userEvent.clear(amount);
      await userEvent.type(amount, "4200");
      await userEvent.type(screen.getByLabelText(/Description/), "Tiles");
      await userEvent.click(screen.getByRole("button", { name: "Save" }));

      expect(updateSpy).toHaveBeenCalledWith({
        id: "pp1",
        supplierId: "corp1",
        projectReportId: "r1",
        amount: 4200,
        date: "2025-03-01",
        isFuture: true,
        description: "Tiles",
        includesVat: false,
      });
    });

    // r1 carries only this 5,000 line against an income of 6,000.
    it("asks before saving a corrected amount above the report's income", async () => {
      vi.mocked(useGetProjectReportsQuery).mockReturnValue({
        data: [
          {
            id: "r1",
            project: { id: "p1", name: "Tower Block" },
            totalIncome: 6000,
            supplierPayments: [{ amount: 5000 }],
          },
        ],
      } as unknown as ReturnType<typeof useGetProjectReportsQuery>);
      renderSupplierPaymentsPage();

      await userEvent.click(
        screen.getByRole("button", { name: "Edit — Tower Block" }),
      );
      const amount = screen.getByLabelText(/Amount/);
      await userEvent.clear(amount);
      await userEvent.type(amount, "6000");
      await userEvent.click(screen.getByRole("button", { name: "Save" }));
      // Level with the income: saved straight away.
      expect(updateSpy).toHaveBeenCalledTimes(1);

      await userEvent.click(
        screen.getByRole("button", { name: "Edit — Tower Block" }),
      );
      await userEvent.clear(screen.getByLabelText(/Amount/));
      await userEvent.type(screen.getByLabelText(/Amount/), "6001");
      await userEvent.click(screen.getByRole("button", { name: "Save" }));

      expect(updateSpy).toHaveBeenCalledTimes(1);
      const warning = screen.getByRole("dialog", {
        name: "Payments exceed income",
      });
      await userEvent.click(
        within(warning).getByRole("button", { name: "Save anyway" }),
      );
      expect(updateSpy).toHaveBeenCalledTimes(2);
      expect(updateSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ amount: 6001 }),
      );
    });

    it("deletes a payment only after confirming", async () => {
      renderSupplierPaymentsPage();

      await userEvent.click(
        screen.getByRole("button", { name: "Delete — Bridge" }),
      );
      expect(deleteSpy).not.toHaveBeenCalled();

      const dialog = screen.getByRole("dialog", {
        name: "Delete this payment?",
      });
      await userEvent.click(
        within(dialog).getByRole("button", { name: "Delete" }),
      );

      expect(deleteSpy).toHaveBeenCalledWith("pp2");
    });

    it("leaves the payment alone when the delete is cancelled", async () => {
      renderSupplierPaymentsPage();

      await userEvent.click(
        screen.getByRole("button", { name: "Delete — Bridge" }),
      );
      await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

      expect(deleteSpy).not.toHaveBeenCalled();
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });
});
