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
}));

import {
  useGetSupplierPaymentsByMonthQuery,
  usePatchSupplierPaymentVatMutation,
} from "@/api/endpoints/supplier-payments";

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
        },
      ],
      total: 5000,
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
        },
      ],
      total: 3000,
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
        },
      ],
      total: 5850,
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
    expect(screen.getByText("Grand Total")).toBeInTheDocument();
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
});
