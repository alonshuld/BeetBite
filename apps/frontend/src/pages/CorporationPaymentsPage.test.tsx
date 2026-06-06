import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/renderWithProviders";
import CorporationPaymentsPage from "./CorporationPaymentsPage";

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useOutletContext: vi.fn(() => ({ month: "2025-03" })) };
});

vi.mock("@/api/endpoints/corporation-payments", () => ({
  useGetCorporationPaymentsByMonthQuery: vi.fn(),
  usePatchCorporationPaymentVatMutation: vi.fn(),
}));

import {
  useGetCorporationPaymentsByMonthQuery,
  usePatchCorporationPaymentVatMutation,
} from "@/api/endpoints/corporation-payments";

const mockData = {
  corporationsPayments: [
    {
      corporation: { id: "corp1", name: "Global Inc" },
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
      corporation: { id: "corp2", name: "Local Ltd" },
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
  corporationsPayments: [
    {
      corporation: { id: "corp1", name: "Global Inc" },
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

function renderCorporationPaymentsPage() {
  return renderWithProviders(<CorporationPaymentsPage />, {
    preloadedState: { auth: { token: "test-token" } },
    initialEntries: ["/corporation-payments"],
  });
}

describe("CorporationPaymentsPage", () => {
  beforeEach(() => {
    vi.mocked(useGetCorporationPaymentsByMonthQuery).mockReturnValue({
      data: mockData,
      isLoading: false,
    } as unknown as ReturnType<typeof useGetCorporationPaymentsByMonthQuery>);
    vi.mocked(usePatchCorporationPaymentVatMutation).mockReturnValue([
      noopMutation,
      { isLoading: false },
    ] as unknown as ReturnType<typeof usePatchCorporationPaymentVatMutation>);
  });

  it("renders page title", () => {
    renderCorporationPaymentsPage();
    expect(
      screen.getByRole("heading", { name: "Corporation Payments" }),
    ).toBeInTheDocument();
  });

  it("renders corporation rows", () => {
    renderCorporationPaymentsPage();
    expect(screen.getByText("Global Inc")).toBeInTheDocument();
    expect(screen.getByText("Local Ltd")).toBeInTheDocument();
  });

  it("renders grand total in footer", () => {
    renderCorporationPaymentsPage();
    expect(screen.getByText("Grand Total")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    vi.mocked(useGetCorporationPaymentsByMonthQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof useGetCorporationPaymentsByMonthQuery>);
    renderCorporationPaymentsPage();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows empty state when no payments", () => {
    vi.mocked(useGetCorporationPaymentsByMonthQuery).mockReturnValue({
      data: { corporationsPayments: [], total: 0 },
      isLoading: false,
    } as unknown as ReturnType<typeof useGetCorporationPaymentsByMonthQuery>);
    renderCorporationPaymentsPage();
    expect(
      screen.getByText(/No corporation payments for/i),
    ).toBeInTheDocument();
  });

  // FIXED: old test looked for count "1" per corp — page now shows a flat table
  // with one row per project payment; verify project names appear in the table.
  it("renders project name in each table row", () => {
    renderCorporationPaymentsPage();
    expect(screen.getByText("Tower Block")).toBeInTheDocument();
    expect(screen.getByText("Bridge")).toBeInTheDocument();
  });

  it("grand total shows ₪ prefix", () => {
    renderCorporationPaymentsPage();
    // grandTotal = 5000 + 3000 = 8000; ₪ appears on each row + total
    expect(screen.getAllByText(/₪/).length).toBeGreaterThan(0);
  });

  describe("VAT input dirty-state save button", () => {
    beforeEach(() => {
      vi.mocked(useGetCorporationPaymentsByMonthQuery).mockReturnValue({
        data: mockDataWithVat,
        isLoading: false,
      } as unknown as ReturnType<typeof useGetCorporationPaymentsByMonthQuery>);
    });

    it("save button is disabled when VAT value is unchanged", () => {
      renderCorporationPaymentsPage();
      const saveBtn = screen.getByRole("button", { name: "Save VAT" });
      expect(saveBtn).toBeDisabled();
    });

    it("save button becomes enabled after changing the VAT value", async () => {
      renderCorporationPaymentsPage();
      const input = screen.getByRole("spinbutton");
      await userEvent.clear(input);
      await userEvent.type(input, "20");
      expect(screen.getByRole("button", { name: "Save VAT" })).not.toBeDisabled();
    });

    it("clicking enabled save button calls patchVat mutation", async () => {
      const mockPatchVat = vi.fn().mockReturnValue({});
      vi.mocked(usePatchCorporationPaymentVatMutation).mockReturnValue([
        mockPatchVat,
        { isLoading: false },
      ] as unknown as ReturnType<typeof usePatchCorporationPaymentVatMutation>);

      renderCorporationPaymentsPage();
      const input = screen.getByRole("spinbutton");
      await userEvent.clear(input);
      await userEvent.type(input, "20");
      await userEvent.click(screen.getByRole("button", { name: "Save VAT" }));
      expect(mockPatchVat).toHaveBeenCalledOnce();
    });

    it("save button stays disabled when VAT value is restored to original", async () => {
      renderCorporationPaymentsPage();
      const input = screen.getByRole("spinbutton");
      await userEvent.clear(input);
      await userEvent.type(input, "17"); // same as vatPercentage: 17
      expect(screen.getByRole("button", { name: "Save VAT" })).toBeDisabled();
    });
  });
});
