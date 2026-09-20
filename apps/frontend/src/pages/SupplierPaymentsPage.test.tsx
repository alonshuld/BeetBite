import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/renderWithProviders";
import SupplierPaymentsPage from "./SupplierPaymentsPage";

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useOutletContext: vi.fn(() => ({ month: "2025-03" })) };
});

vi.mock("@/api/endpoints/supplier-payments", () => ({
  useGetSupplierPaymentsByMonthQuery: vi.fn(),
  usePatchSupplierPaymentVatMutation: vi.fn(),
  useSetSupplierPaymentPaidMutation: vi.fn(),
  useSetSupplierPaymentsPaidMutation: vi.fn(),
  useBatchCreateSupplierPaymentsMutation: vi.fn(),
}));
vi.mock("@/api/endpoints/suppliers", () => ({ useGetSuppliersQuery: vi.fn() }));
vi.mock("@/api/endpoints/project-reports", () => ({
  useGetProjectReportsQuery: vi.fn(),
}));

import {
  useGetSupplierPaymentsByMonthQuery,
  usePatchSupplierPaymentVatMutation,
  useSetSupplierPaymentPaidMutation,
  useSetSupplierPaymentsPaidMutation,
  useBatchCreateSupplierPaymentsMutation,
} from "@/api/endpoints/supplier-payments";
import { useGetSuppliersQuery } from "@/api/endpoints/suppliers";
import { useGetProjectReportsQuery } from "@/api/endpoints/project-reports";

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

/** Data that includes a non-future payment so VatInput renders */
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

const noopMutation = vi
  .fn()
  .mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });

function renderSupplierPaymentsPage() {
  return renderWithProviders(<SupplierPaymentsPage />, {
    preloadedState: { auth: { token: "test-token" } },
    initialEntries: ["/supplier-payments"],
  });
}

const setPaidSpy = vi.fn().mockResolvedValue({ data: {} });
const setAllPaidSpy = vi.fn().mockResolvedValue({ data: {} });
const batchSpy = vi.fn().mockResolvedValue({ data: [] });

describe("SupplierPaymentsPage", () => {
  beforeEach(() => {
    vi.mocked(useGetSupplierPaymentsByMonthQuery).mockReturnValue({
      data: mockData,
      isLoading: false,
    } as unknown as ReturnType<typeof useGetSupplierPaymentsByMonthQuery>);
    vi.mocked(usePatchSupplierPaymentVatMutation).mockReturnValue([
      noopMutation,
      { isLoading: false },
    ] as unknown as ReturnType<typeof usePatchSupplierPaymentVatMutation>);
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
    vi.mocked(useGetSuppliersQuery).mockReturnValue({
      data: [{ id: "corp1", name: "Global Inc" }],
    } as unknown as ReturnType<typeof useGetSuppliersQuery>);
    vi.mocked(useGetProjectReportsQuery).mockReturnValue({
      data: [
        { id: "r1", project: { id: "p1", name: "Tower Block" } },
        { id: "r2", project: { id: "p2", name: "Bridge" } },
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

  describe("VAT input dirty-state save button", () => {
    beforeEach(() => {
      vi.mocked(useGetSupplierPaymentsByMonthQuery).mockReturnValue({
        data: mockDataWithVat,
        isLoading: false,
      } as unknown as ReturnType<typeof useGetSupplierPaymentsByMonthQuery>);
    });

    it("save button is disabled when VAT value is unchanged", () => {
      renderSupplierPaymentsPage();
      const saveBtn = screen.getByRole("button", { name: "Save VAT" });
      expect(saveBtn).toBeDisabled();
    });

    it("save button becomes enabled after changing the VAT value", async () => {
      renderSupplierPaymentsPage();
      const input = screen.getByRole("spinbutton");
      await userEvent.clear(input);
      await userEvent.type(input, "20");
      expect(
        screen.getByRole("button", { name: "Save VAT" }),
      ).not.toBeDisabled();
    });

    it("clicking enabled save button calls patchVat mutation", async () => {
      const mockPatchVat = vi.fn().mockReturnValue({});
      vi.mocked(usePatchSupplierPaymentVatMutation).mockReturnValue([
        mockPatchVat,
        { isLoading: false },
      ] as unknown as ReturnType<typeof usePatchSupplierPaymentVatMutation>);

      renderSupplierPaymentsPage();
      const input = screen.getByRole("spinbutton");
      await userEvent.clear(input);
      await userEvent.type(input, "20");
      await userEvent.click(screen.getByRole("button", { name: "Save VAT" }));
      expect(mockPatchVat).toHaveBeenCalledOnce();
    });

    it("save button stays disabled when VAT value is restored to original", async () => {
      renderSupplierPaymentsPage();
      const input = screen.getByRole("spinbutton");
      await userEvent.clear(input);
      await userEvent.type(input, "17"); // same as vatPercentage: 17
      expect(screen.getByRole("button", { name: "Save VAT" })).toBeDisabled();
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
});
