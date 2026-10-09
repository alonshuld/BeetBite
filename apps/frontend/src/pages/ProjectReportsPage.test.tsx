import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/renderWithProviders";
import ProjectReportsPage from "./ProjectReportsPage";

const navigateSpy = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useOutletContext: vi.fn(() => ({ month: "2025-03" })),
    useParams: vi.fn(() => ({ id: "p1" })),
    useNavigate: vi.fn(() => navigateSpy),
  };
});

vi.mock("@/api/endpoints/project-reports", () => ({
  useGetProjectReportsQuery: vi.fn(),
  useGetProjectReportQuery: vi.fn(),
  useUpdateProjectReportMutation: vi.fn(),
  useCreateProjectReportMutation: vi.fn(),
  useAddIncomeEntryMutation: vi.fn(),
  useUpdateIncomeEntryMutation: vi.fn(),
  useDeleteIncomeEntryMutation: vi.fn(),
  useDeleteProjectReportMutation: vi.fn(),
}));
vi.mock("@/api/endpoints/supplier-payments", () => ({
  useCreateSupplierPaymentMutation: vi.fn(),
  useUpdateSupplierPaymentMutation: vi.fn(),
  useDeleteSupplierPaymentMutation: vi.fn(),
}));
vi.mock("@/api/endpoints/projects", () => ({ useGetProjectsQuery: vi.fn() }));
vi.mock("@/api/endpoints/subcontractors", () => ({
  useGetSubcontractorsQuery: vi.fn(),
  useGetSubcontractorTeamsQuery: vi.fn(() => ({ data: [] })),
}));
vi.mock("@/api/endpoints/suppliers", () => ({
  useGetSuppliersQuery: vi.fn(),
}));
vi.mock("@/api/endpoints/project-report-exports", () => ({
  useExportProjectReportsPdfMutation: vi.fn(),
}));
vi.mock("@/api/endpoints/subcontractor-payments", () => ({
  useGetSubcontractorPaymentsQuery: vi.fn(),
}));

import {
  useGetProjectReportsQuery,
  useGetProjectReportQuery,
  useUpdateProjectReportMutation,
  useCreateProjectReportMutation,
  useAddIncomeEntryMutation,
  useUpdateIncomeEntryMutation,
  useDeleteIncomeEntryMutation,
  useDeleteProjectReportMutation,
} from "@/api/endpoints/project-reports";
import {
  useCreateSupplierPaymentMutation,
  useUpdateSupplierPaymentMutation,
  useDeleteSupplierPaymentMutation,
} from "@/api/endpoints/supplier-payments";
import { useGetProjectsQuery } from "@/api/endpoints/projects";
import { useGetSubcontractorsQuery } from "@/api/endpoints/subcontractors";
import { useGetSuppliersQuery } from "@/api/endpoints/suppliers";
import { useGetSubcontractorPaymentsQuery } from "@/api/endpoints/subcontractor-payments";
import { useExportProjectReportsPdfMutation } from "@/api/endpoints/project-report-exports";

const mockProject = {
  id: "p1",
  name: "Tower Block",
  clientId: "c1",
  estimatedAmount: 100000,
  paymentProgress: { totalPaid: 25000 },
  description: null,
};

const mockListReport = { id: "r1", project: { id: "p1" } };

const mockDetail = {
  id: "r1",
  date: "2025-03-01",
  project: { id: "p1", name: "Tower Block", initiatorName: null },
  initiatorIncome: null,
  totalIncome: 10000,
  profitMargin: 20,
  profit: 2000,
  incomeEntries: [
    { id: "ie1", amount: 10000, incomeDate: "2025-03-10", tag: "Shell" },
  ],
  supplierPayments: [
    {
      id: "cp1",
      supplier: { id: "co1", name: "Flooring Ltd" },
      amount: 1500,
      vatPercentage: null,
      effectiveTotal: 1500,
    },
  ],
  subcontractor: { id: "s1", name: "Bob the Builder", payment: 6500 },
};

const deleteEntrySpy = vi.fn().mockReturnValue({ unwrap: vi.fn() });
const updateEntrySpy = vi.fn().mockReturnValue({ unwrap: vi.fn() });
const addEntrySpy = vi.fn().mockReturnValue({ unwrap: vi.fn() });
const updateReportSpy = vi.fn().mockReturnValue({ unwrap: vi.fn() });
const exportPdfSpy = vi.fn().mockReturnValue({
  unwrap: vi.fn().mockResolvedValue(new Blob(["%PDF"])),
});

function mut(spy = vi.fn().mockReturnValue({ unwrap: vi.fn() })) {
  return [spy, { isLoading: false }] as unknown as never;
}

function setDetail(detail: unknown) {
  vi.mocked(useGetProjectReportQuery).mockReturnValue({
    data: detail,
  } as unknown as ReturnType<typeof useGetProjectReportQuery>);
}

function setMonthlyPayments(data: unknown) {
  vi.mocked(useGetSubcontractorPaymentsQuery).mockReturnValue({
    data,
  } as unknown as ReturnType<typeof useGetSubcontractorPaymentsQuery>);
}

function setListReports(data: unknown) {
  vi.mocked(useGetProjectReportsQuery).mockReturnValue({
    data,
    isLoading: false,
  } as unknown as ReturnType<typeof useGetProjectReportsQuery>);
}

function renderPage() {
  return renderWithProviders(<ProjectReportsPage />, {
    preloadedState: { auth: { token: "test-token" } },
    initialEntries: ["/reports/projects/p1"],
  });
}

describe("ProjectReportsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setListReports([mockListReport]);
    setDetail(mockDetail);
    vi.mocked(useGetProjectsQuery).mockReturnValue({
      data: [mockProject],
    } as unknown as ReturnType<typeof useGetProjectsQuery>);
    vi.mocked(useGetSubcontractorsQuery).mockReturnValue({
      data: [{ id: "s1", name: "Bob the Builder" }],
    } as unknown as ReturnType<typeof useGetSubcontractorsQuery>);
    vi.mocked(useGetSuppliersQuery).mockReturnValue({
      data: [{ id: "co1", name: "Flooring Ltd" }],
    } as unknown as ReturnType<typeof useGetSuppliersQuery>);
    vi.mocked(useUpdateProjectReportMutation).mockReturnValue(
      mut(updateReportSpy),
    );
    vi.mocked(useCreateProjectReportMutation).mockReturnValue(mut());
    vi.mocked(useAddIncomeEntryMutation).mockReturnValue(mut(addEntrySpy));
    vi.mocked(useUpdateIncomeEntryMutation).mockReturnValue(
      mut(updateEntrySpy),
    );
    vi.mocked(useDeleteIncomeEntryMutation).mockReturnValue(
      mut(deleteEntrySpy),
    );
    vi.mocked(useCreateSupplierPaymentMutation).mockReturnValue(mut());
    vi.mocked(useUpdateSupplierPaymentMutation).mockReturnValue(mut());
    vi.mocked(useDeleteSupplierPaymentMutation).mockReturnValue(mut());
    vi.mocked(useDeleteProjectReportMutation).mockReturnValue(mut());
    vi.mocked(useExportProjectReportsPdfMutation).mockReturnValue(
      mut(exportPdfSpy),
    );
    setMonthlyPayments([]);
  });

  it("renders the project name as the heading", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: "Tower Block" }),
    ).toBeInTheDocument();
  });

  it("renders estimated amount and total-paid stat cards", () => {
    renderPage();
    expect(screen.getByText("₪100,000")).toBeInTheDocument();
    expect(screen.getByText("₪25,000")).toBeInTheDocument();
  });

  it("shows the completion percentage (25,000 / 100,000 = 25%)", () => {
    renderPage();
    expect(screen.getByText("25%")).toBeInTheDocument();
  });

  it("renders the report panel with income, profit and subcontractor payment", () => {
    renderPage();
    expect(screen.getByText("₪10,000")).toBeInTheDocument();
    expect(screen.getByText("₪2,000")).toBeInTheDocument();
    expect(screen.getByText("Bob the Builder")).toBeInTheDocument();
    expect(screen.getByText("₪6,500")).toBeInTheDocument();
    expect(screen.getByText("Flooring Ltd")).toBeInTheDocument();
  });

  it("shows the empty state when there is no report for the month", () => {
    setListReports([]);
    setDetail(undefined);
    renderPage();
    expect(screen.getByText("No report for this month")).toBeInTheDocument();
  });

  it("opens the edit modal prefilled when Edit is clicked", async () => {
    renderPage();
    // The report-level Edit button is the first one.
    await userEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    expect(
      screen.getByRole("heading", { name: "Edit Project Reports" }),
    ).toBeInTheDocument();
  });

  // General edit-report modal — regression coverage for a past bug: this
  // modal used to send a full `incomeEntries` array through the report-update
  // DTO, which the backend applies as deleteMany + createMany, destroying
  // every income row's id (and its tag) on every save. Income entries must
  // instead be reconciled through the dedicated
  // per-entry endpoints, and the report DTO must never carry `incomeEntries`.
  describe("edit-report modal — income entry reconciliation", () => {
    it("saving with no entry changes updates the existing entry by id and omits incomeEntries from the report DTO", async () => {
      renderPage();
      await userEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);
      await userEvent.click(screen.getByRole("button", { name: "Save" }));

      expect(updateEntrySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "ie1",
          amount: 10000,
          incomeDate: "2025-03-10",
        }),
      );
      expect(addEntrySpy).not.toHaveBeenCalled();
      expect(deleteEntrySpy).not.toHaveBeenCalled();
      expect(updateReportSpy).toHaveBeenCalledTimes(1);
      const dto = updateReportSpy.mock.calls[0][0] as Record<string, unknown>;
      expect(dto).not.toHaveProperty("incomeEntries");
    });

    it("shows each entry's tag in the modal and saves an edited tag on the existing entry", async () => {
      renderPage();
      await userEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);

      const tagInput = screen.getByLabelText("Work");
      expect(tagInput).toHaveValue("Shell");
      await userEvent.clear(tagInput);
      await userEvent.type(tagInput, "Foundation");
      await userEvent.click(screen.getByRole("button", { name: "Save" }));

      expect(updateEntrySpy).toHaveBeenCalledWith(
        expect.objectContaining({ id: "ie1", tag: "Foundation" }),
      );
      expect(addEntrySpy).not.toHaveBeenCalled();
      const dto = updateReportSpy.mock.calls[0][0] as Record<string, unknown>;
      expect(dto).not.toHaveProperty("incomeEntries");
    });

    it("saving with an untouched tag keeps it as is", async () => {
      renderPage();
      await userEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);
      await userEvent.click(screen.getByRole("button", { name: "Save" }));

      expect(updateEntrySpy).toHaveBeenCalledWith(
        expect.objectContaining({ id: "ie1", tag: "Shell" }),
      );
    });

    it("clearing the tag in the modal sends null", async () => {
      renderPage();
      await userEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);
      await userEvent.clear(screen.getByLabelText("Work"));
      await userEvent.click(screen.getByRole("button", { name: "Save" }));

      expect(updateEntrySpy).toHaveBeenCalledWith(
        expect.objectContaining({ id: "ie1", tag: null }),
      );
    });

    it("adding a new row in the modal creates it via addIncomeEntry, leaving the existing entry's id untouched", async () => {
      renderPage();
      await userEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);

      const addButtons = screen.getAllByRole("button", { name: /add income/i });
      await userEvent.click(addButtons[addButtons.length - 1]);

      const amountInputs = screen.getAllByLabelText("Income (₪)");
      await userEvent.type(amountInputs[amountInputs.length - 1], "500");
      await userEvent.click(screen.getByRole("button", { name: "Save" }));

      expect(addEntrySpy).toHaveBeenCalledWith(
        expect.objectContaining({ reportId: "r1", amount: 500 }),
      );
      // The pre-existing entry is still reconciled by its own id, not
      // recreated alongside the new one.
      expect(updateEntrySpy).toHaveBeenCalledWith(
        expect.objectContaining({ id: "ie1" }),
      );
      expect(deleteEntrySpy).not.toHaveBeenCalled();
    });

    it("removing a row in the modal deletes only that entry via deleteIncomeEntry", async () => {
      setDetail({
        ...mockDetail,
        incomeEntries: [
          { id: "ie1", amount: 10000, incomeDate: "2025-03-10", tag: "Shell" },
          { id: "ie2", amount: 2000, incomeDate: null, tag: null },
        ],
      });
      renderPage();
      await userEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);

      // Remove buttons inside the modal's income-entry rows; the last one
      // corresponds to the second draft row (ie2).
      const removeButtons = screen.getAllByRole("button", { name: "Remove" });
      await userEvent.click(removeButtons[removeButtons.length - 1]);
      await userEvent.click(screen.getByRole("button", { name: "Save" }));

      expect(deleteEntrySpy).toHaveBeenCalledWith("ie2");
      expect(updateEntrySpy).toHaveBeenCalledWith(
        expect.objectContaining({ id: "ie1" }),
      );
      expect(updateEntrySpy).not.toHaveBeenCalledWith(
        expect.objectContaining({ id: "ie2" }),
      );
    });
  });

  it("reveals the inline add-income form", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /add income/i }));
    // Two income amount inputs would appear (existing none in edit), at least the
    // inline new-entry save button shows.
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  it("fires delete when removing an income entry", async () => {
    renderPage();
    await userEvent.click(screen.getAllByRole("button", { name: "Remove" })[0]);
    expect(deleteEntrySpy).toHaveBeenCalledWith("ie1");
  });

  it("shows the entry's tag in place of the generic income label", () => {
    renderPage();
    expect(screen.getByText("Shell")).toBeInTheDocument();
  });

  it("edits an income entry's tag inline without recreating the entry", async () => {
    renderPage();
    // Entry-level Edit is the second Edit button (index 0 is the report-level one).
    await userEvent.click(screen.getAllByRole("button", { name: "Edit" })[1]);

    const tagInput = screen.getByLabelText("Work");
    await userEvent.clear(tagInput);
    await userEvent.type(tagInput, "Foundation");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    // The dedicated single-entry endpoint is used — same entry id, tag only
    // changes alongside whatever else was in the edit row, never a full
    // report rewrite.
    expect(updateEntrySpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: "ie1", tag: "Foundation" }),
    );
  });

  // Initiator income, gated on the project actually having an initiator
  // linked, on this per-project drill-down — the screen users reach by
  // clicking a report, so it has to be settable here, not only in the modal.
  describe("initiator income", () => {
    function withInitiator() {
      vi.mocked(useGetProjectsQuery).mockReturnValue({
        data: [{ ...mockProject, initiatorId: "init1" }],
      } as unknown as ReturnType<typeof useGetProjectsQuery>);
    }

    it("does not show initiator income when the project has no initiator", () => {
      renderPage();
      expect(screen.queryByText("Initiator Income")).not.toBeInTheDocument();
    });

    it("shows the stored initiator income without touching the subcontractor payment", () => {
      withInitiator();
      setDetail({ ...mockDetail, initiatorIncome: 30000 });

      renderPage();

      expect(screen.getByText("Initiator Income")).toBeInTheDocument();
      expect(screen.getByText("₪30,000")).toBeInTheDocument();
      // Unaffected: the subcontractor payment is still the fixture's 6,500.
      expect(screen.getByText("₪6,500")).toBeInTheDocument();
    });

    it("shows that initiator income is not set yet", () => {
      withInitiator();
      setDetail({ ...mockDetail, initiatorIncome: null });

      renderPage();

      expect(screen.getByText("Not configured")).toBeInTheDocument();
    });

    it("saves initiator income inline through the report update", async () => {
      withInitiator();
      setDetail({ ...mockDetail, initiatorIncome: null });

      renderPage();
      const editButtons = screen.getAllByRole("button", { name: "Edit" });
      await userEvent.click(editButtons[editButtons.length - 1]);
      await userEvent.type(screen.getByLabelText("Initiator Income"), "30000");
      await userEvent.click(screen.getByRole("button", { name: "Save" }));

      expect(updateReportSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "r1",
          projectId: "p1",
          subcontractorId: "s1",
          profitMargin: 20,
          initiatorIncome: 30000,
        }),
      );
    });

    it("has no remove button while initiator income is not set", () => {
      withInitiator();
      setDetail({ ...mockDetail, initiatorIncome: null });

      renderPage();

      // The only Remove buttons are the income entry's and the supplier's.
      expect(screen.getAllByRole("button", { name: "Remove" })).toHaveLength(2);
    });

    it("removes the stored initiator income through the report update", async () => {
      withInitiator();
      setDetail({ ...mockDetail, initiatorIncome: 30000 });

      renderPage();
      const removeButtons = screen.getAllByRole("button", { name: "Remove" });
      await userEvent.click(removeButtons[removeButtons.length - 1]);

      expect(updateReportSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "r1",
          projectId: "p1",
          subcontractorId: "s1",
          profitMargin: 20,
          initiatorIncome: null,
        }),
      );
    });

    it("clears a stored initiator income emptied in the edit modal", async () => {
      withInitiator();
      setDetail({ ...mockDetail, initiatorIncome: 30000 });

      renderPage();
      await userEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);
      await userEvent.clear(screen.getByLabelText("Initiator Income"));
      await userEvent.click(screen.getByRole("button", { name: "Save" }));

      expect(updateReportSpy).toHaveBeenCalledWith(
        expect.objectContaining({ id: "r1", initiatorIncome: null }),
      );
    });
  });

  describe("PDF export", () => {
    beforeEach(() => {
      URL.createObjectURL = vi.fn(() => "blob:pdf");
      URL.revokeObjectURL = vi.fn();
    });

    it("has no export button when there is no report for the month", () => {
      setListReports([]);
      setDetail(undefined);
      renderPage();
      expect(
        screen.queryByRole("button", { name: /export pdf/i }),
      ).not.toBeInTheDocument();
    });

    it("exports this month's report, seeded from the project", async () => {
      vi.mocked(useGetProjectsQuery).mockReturnValue({
        data: [
          {
            ...mockProject,
            description: "North wing",
            lastApprovedFor: "Phase 2",
          },
        ],
      } as unknown as ReturnType<typeof useGetProjectsQuery>);

      renderPage();
      await userEvent.click(
        screen.getByRole("button", { name: /export pdf/i }),
      );

      expect(screen.getByLabelText("Description")).toHaveValue("North wing");
      await userEvent.click(screen.getByRole("button", { name: "Save" }));

      expect(exportPdfSpy).toHaveBeenCalledWith({
        projectReportId: "r1",
        approvedFor: "Phase 2",
        description: "North wing",
        lang: "en",
      });
    });

    it("refuses to open when the initiator income is missing", async () => {
      setDetail({
        ...mockDetail,
        project: { ...mockDetail.project, initiatorName: "Dana" },
        initiatorIncome: null,
      });

      renderPage();
      await userEvent.click(
        screen.getByRole("button", { name: /export pdf/i }),
      );

      expect(
        await screen.findByText(
          "Set this report's initiator income before exporting its PDF.",
        ),
      ).toBeInTheDocument();
      expect(exportPdfSpy).not.toHaveBeenCalled();
    });
  });
});
