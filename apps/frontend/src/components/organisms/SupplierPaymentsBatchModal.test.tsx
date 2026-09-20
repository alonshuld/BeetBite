import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/renderWithProviders";
import { SupplierPaymentsBatchModal } from "./SupplierPaymentsBatchModal";

vi.mock("@/api/endpoints/supplier-payments", () => ({
  useBatchCreateSupplierPaymentsMutation: vi.fn(),
}));
vi.mock("@/api/endpoints/suppliers", () => ({ useGetSuppliersQuery: vi.fn() }));
vi.mock("@/api/endpoints/project-reports", () => ({
  useGetProjectReportsQuery: vi.fn(),
}));
vi.mock("@/api/endpoints/vatRates", () => ({
  useGetResolvedVatRateQuery: vi.fn(),
}));

import { useBatchCreateSupplierPaymentsMutation } from "@/api/endpoints/supplier-payments";
import { useGetSuppliersQuery } from "@/api/endpoints/suppliers";
import { useGetProjectReportsQuery } from "@/api/endpoints/project-reports";
import { useGetResolvedVatRateQuery } from "@/api/endpoints/vatRates";

const batchSpy = vi.fn().mockResolvedValue({ data: [] });

function setReports(data: unknown) {
  vi.mocked(useGetProjectReportsQuery).mockReturnValue({
    data,
  } as unknown as ReturnType<typeof useGetProjectReportsQuery>);
}

function setVatRate(percentage: number | null) {
  vi.mocked(useGetResolvedVatRateQuery).mockReturnValue({
    data: { percentage },
  } as unknown as ReturnType<typeof useGetResolvedVatRateQuery>);
}

function renderModal(open = true) {
  return renderWithProviders(
    <SupplierPaymentsBatchModal
      open={open}
      month="2025-03"
      onClose={vi.fn()}
    />,
    { preloadedState: { auth: { token: "test-token" } } },
  );
}

describe("SupplierPaymentsBatchModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useBatchCreateSupplierPaymentsMutation).mockReturnValue([
      batchSpy,
      { isLoading: false },
    ] as unknown as ReturnType<typeof useBatchCreateSupplierPaymentsMutation>);
    vi.mocked(useGetSuppliersQuery).mockReturnValue({
      data: [
        { id: "s1", name: "Global Inc" },
        { id: "s2", name: "Local Ltd" },
      ],
    } as unknown as ReturnType<typeof useGetSuppliersQuery>);
    setReports([
      { id: "r1", project: { id: "p1", name: "Tower Block" } },
      { id: "r2", project: { id: "p2", name: "Bridge" } },
    ]);
    setVatRate(18);
  });

  it("renders nothing when closed", () => {
    renderModal(false);
    expect(screen.queryByText(/Document payments/)).toBeNull();
  });

  // A payment hangs off a project *report*, so a project with no report for
  // the month cannot receive one. Listing it would offer an unusable choice.
  it("lists only projects that have a report for the month", () => {
    renderModal();

    const projectSelect = screen.getByLabelText(/Project/);
    const options = within(projectSelect)
      .getAllByRole("option")
      .map((option) => option.textContent);
    expect(options).toContain("Tower Block");
    expect(options).toContain("Bridge");
  });

  it("explains why the project list may be short", () => {
    renderModal();
    expect(
      screen.getByText(/Only projects with a report for this month/),
    ).toBeInTheDocument();
  });

  it("says so when no project has a report this month", () => {
    setReports([]);
    renderModal();
    expect(screen.getByText(/No project has a report/)).toBeInTheDocument();
  });

  // The running total exists to be reconciled against the paperwork before
  // saving — that is the whole point of entering a stack in one go.
  it("keeps a running total as lines are filled in", async () => {
    renderModal();

    await userEvent.selectOptions(screen.getByLabelText(/Project/), "r1");
    await userEvent.type(screen.getByLabelText(/Amount/), "1500");

    expect(screen.getByText("₪1,500")).toBeInTheDocument();
  });

  it("adds and removes lines", async () => {
    renderModal();

    expect(screen.getAllByLabelText(/Project/)).toHaveLength(1);
    await userEvent.click(screen.getByRole("button", { name: /Add line/ }));
    expect(screen.getAllByLabelText(/Project/)).toHaveLength(2);

    await userEvent.click(screen.getAllByRole("button", { name: /Remove/ })[0]);
    expect(screen.getAllByLabelText(/Project/)).toHaveLength(1);
  });

  it("submits every filled line under one supplier in a single call", async () => {
    renderModal();

    await userEvent.selectOptions(screen.getByLabelText(/Supplier/), "s1");
    await userEvent.selectOptions(screen.getByLabelText(/Project/), "r1");
    await userEvent.type(screen.getByLabelText(/Amount/), "1000");

    await userEvent.click(screen.getByRole("button", { name: /Add line/ }));
    await userEvent.selectOptions(screen.getAllByLabelText(/Project/)[1], "r2");
    await userEvent.type(screen.getAllByLabelText(/Amount/)[1], "2000");

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(batchSpy).toHaveBeenCalledTimes(1);
    const call = batchSpy.mock.calls[0][0] as {
      supplierId: string;
      payments: { projectReportId: string; amount: number }[];
    };
    expect(call.supplierId).toBe("s1");
    expect(call.payments).toHaveLength(2);
    expect(call.payments[0]).toMatchObject({
      projectReportId: "r1",
      amount: 1000,
    });
    expect(call.payments[1]).toMatchObject({
      projectReportId: "r2",
      amount: 2000,
    });
  });

  it("ignores half-filled lines rather than sending them", async () => {
    renderModal();

    await userEvent.selectOptions(screen.getByLabelText(/Supplier/), "s1");
    await userEvent.selectOptions(screen.getByLabelText(/Project/), "r1");
    await userEvent.type(screen.getByLabelText(/Amount/), "1000");
    // A second line with a project but no amount is not part of the paperwork.
    await userEvent.click(screen.getByRole("button", { name: /Add line/ }));
    await userEvent.selectOptions(screen.getAllByLabelText(/Project/)[1], "r2");

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    const call = batchSpy.mock.calls[0][0] as { payments: unknown[] };
    expect(call.payments).toHaveLength(1);
  });

  it("does not submit without a supplier", async () => {
    renderModal();

    await userEvent.selectOptions(screen.getByLabelText(/Project/), "r1");
    await userEvent.type(screen.getByLabelText(/Amount/), "1000");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(batchSpy).not.toHaveBeenCalled();
  });

  // The percentage is the global rate for the month — the user only decides,
  // line by line, whether VAT applies.
  describe("VAT", () => {
    async function fillLine(index: number, reportId: string, amount: string) {
      await userEvent.selectOptions(
        screen.getAllByLabelText(/Project/)[index],
        reportId,
      );
      await userEvent.type(screen.getAllByLabelText(/Amount/)[index], amount);
    }

    function sentVat(): boolean[] {
      const call = batchSpy.mock.calls[0][0] as {
        payments: { includesVat: boolean }[];
      };
      return call.payments.map((payment) => payment.includesVat);
    }

    it("shows the global rate that will apply instead of asking for one", () => {
      renderModal();

      expect(
        screen.getByText(/VAT is added at the global rate for this month: 18%/),
      ).toBeInTheDocument();
      expect(screen.queryByLabelText(/VAT %/)).toBeNull();
    });

    it("warns when the month has no VAT rate yet", () => {
      setVatRate(null);
      renderModal();

      expect(
        screen.getByText(/No VAT rate is set for this month/),
      ).toBeVisible();
    });

    it("includes VAT on a line by default", async () => {
      renderModal();

      expect(
        screen.getByRole("checkbox", { name: "Include VAT" }),
      ).toBeChecked();

      await userEvent.selectOptions(screen.getByLabelText(/Supplier/), "s1");
      await fillLine(0, "r1", "1000");
      await userEvent.click(screen.getByRole("button", { name: /save/i }));

      expect(sentVat()).toEqual([true]);
    });

    it("lets a line opt out of VAT", async () => {
      renderModal();

      await userEvent.selectOptions(screen.getByLabelText(/Supplier/), "s1");
      await fillLine(0, "r1", "1000");
      await userEvent.click(
        screen.getByRole("checkbox", { name: "Include VAT" }),
      );
      await userEvent.click(screen.getByRole("button", { name: /save/i }));

      expect(sentVat()).toEqual([false]);
    });

    it("decides VAT per line, not for the whole stack", async () => {
      renderModal();

      await userEvent.selectOptions(screen.getByLabelText(/Supplier/), "s1");
      await fillLine(0, "r1", "1000");
      await userEvent.click(screen.getByRole("button", { name: /Add line/ }));
      await fillLine(1, "r2", "2000");
      // Untick only the second line.
      await userEvent.click(
        screen.getAllByRole("checkbox", { name: "Include VAT" })[1],
      );
      await userEvent.click(screen.getByRole("button", { name: /save/i }));

      expect(sentVat()).toEqual([true, false]);
    });
  });
});
