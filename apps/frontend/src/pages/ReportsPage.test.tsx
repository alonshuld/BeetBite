import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/renderWithProviders";
import ReportsPage from "./ReportsPage";

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useOutletContext: vi.fn(() => ({ month: "2025-03" })) };
});

vi.mock("@/api/endpoints/project-reports", () => ({
  useGetProjectReportsQuery: vi.fn(),
  useCreateProjectReportMutation: vi.fn(),
  useUpdateIncomeEntryMutation: vi.fn(),
}));
vi.mock("@/api/endpoints/clients", () => ({ useGetClientsQuery: vi.fn() }));
vi.mock("@/api/endpoints/projects", () => ({
  useGetProjectsQuery: vi.fn(),
  useUpdateProjectMutation: vi.fn(),
}));
vi.mock("@/api/endpoints/subcontractors", () => ({
  useGetSubcontractorsQuery: vi.fn(),
}));
vi.mock("@/api/endpoints/suppliers", () => ({
  useGetSuppliersQuery: vi.fn(),
}));
vi.mock("@/api/endpoints/initiators", () => ({
  useGetInitiatorsQuery: vi.fn(),
}));
vi.mock("@/api/endpoints/project-report-exports", () => ({
  useExportProjectReportsPdfMutation: vi.fn(),
  useExportClientSimulatedPdfMutation: vi.fn(),
}));

import {
  useGetProjectReportsQuery,
  useCreateProjectReportMutation,
  useUpdateIncomeEntryMutation,
} from "@/api/endpoints/project-reports";
import { useGetClientsQuery } from "@/api/endpoints/clients";
import {
  useGetProjectsQuery,
  useUpdateProjectMutation,
} from "@/api/endpoints/projects";
import { useGetSubcontractorsQuery } from "@/api/endpoints/subcontractors";
import { useGetSuppliersQuery } from "@/api/endpoints/suppliers";
import { useGetInitiatorsQuery } from "@/api/endpoints/initiators";
import {
  useExportProjectReportsPdfMutation,
  useExportClientSimulatedPdfMutation,
} from "@/api/endpoints/project-report-exports";

const mockReports = [
  {
    id: "r1",
    date: "2025-03-01",
    project: {
      id: "p1",
      name: "Tower Block",
      description: "A very tall residential tower",
      location: "1 Skyline Ave",
      requesterName: "Jane Doe",
      client: { id: "c1", name: "Acme Corp" },
    },
    subcontractor: { id: "s1", name: "Bob the Builder" },
    totalIncome: 10000,
    profitMargin: 20,
    supplierPayments: [],
    incomeEntries: [
      { id: "ie1", amount: 6000, incomeDate: "2025-03-10", tag: "Shell" },
      { id: "ie2", amount: 4000, incomeDate: null, tag: "Finishing" },
    ],
  },
];

const createSpy = vi
  .fn()
  .mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });

const exportSpy = vi
  .fn()
  .mockReturnValue({ unwrap: vi.fn().mockResolvedValue(new Blob()) });

const exportSimulatedSpy = vi
  .fn()
  .mockReturnValue({ unwrap: vi.fn().mockResolvedValue(new Blob()) });

const updateProjectSpy = vi
  .fn()
  .mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });

const updateIncomeEntrySpy = vi
  .fn()
  .mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });

function setReports(data: unknown, isLoading = false) {
  vi.mocked(useGetProjectReportsQuery).mockReturnValue({
    data,
    isLoading,
  } as unknown as ReturnType<typeof useGetProjectReportsQuery>);
}

function renderPage() {
  return renderWithProviders(<ReportsPage />, {
    preloadedState: { auth: { token: "test-token" } },
    initialEntries: ["/reports"],
  });
}

describe("ReportsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setReports(mockReports);
    vi.mocked(useGetClientsQuery).mockReturnValue({
      data: [{ id: "c1", name: "Acme Corp" }],
    } as unknown as ReturnType<typeof useGetClientsQuery>);
    vi.mocked(useGetProjectsQuery).mockReturnValue({
      data: [
        {
          id: "p1",
          name: "Tower Block",
          clientId: "c1",
          description: "Shell + finishing work",
          estimatedAmount: 100000,
          isDone: false,
          lastApprovedFor: null,
        },
      ],
    } as unknown as ReturnType<typeof useGetProjectsQuery>);
    vi.mocked(useUpdateProjectMutation).mockReturnValue([
      updateProjectSpy,
      { isLoading: false },
    ] as unknown as ReturnType<typeof useUpdateProjectMutation>);
    vi.mocked(useGetSubcontractorsQuery).mockReturnValue({
      data: [{ id: "s1", name: "Bob the Builder" }],
    } as unknown as ReturnType<typeof useGetSubcontractorsQuery>);
    vi.mocked(useGetSuppliersQuery).mockReturnValue({
      data: [{ id: "co1", name: "Flooring Ltd" }],
    } as unknown as ReturnType<typeof useGetSuppliersQuery>);
    vi.mocked(useGetInitiatorsQuery).mockReturnValue({
      data: [{ id: "init1", name: "Yaniv Goldman" }],
    } as unknown as ReturnType<typeof useGetInitiatorsQuery>);
    vi.mocked(useCreateProjectReportMutation).mockReturnValue([
      createSpy,
      { isLoading: false },
    ] as unknown as ReturnType<typeof useCreateProjectReportMutation>);
    vi.mocked(useExportProjectReportsPdfMutation).mockReturnValue([
      exportSpy,
      { isLoading: false },
    ] as unknown as ReturnType<typeof useExportProjectReportsPdfMutation>);
    vi.mocked(useExportClientSimulatedPdfMutation).mockReturnValue([
      exportSimulatedSpy,
      { isLoading: false },
    ] as unknown as ReturnType<typeof useExportClientSimulatedPdfMutation>);
    vi.mocked(useUpdateIncomeEntryMutation).mockReturnValue([
      updateIncomeEntrySpy,
      { isLoading: false },
    ] as unknown as ReturnType<typeof useUpdateIncomeEntryMutation>);
  });

  it("renders the page title", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: "Project Reports" }),
    ).toBeInTheDocument();
  });

  it("groups reports into a card per client", () => {
    renderPage();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("shows the empty state when there are no reports", () => {
    setReports([]);
    renderPage();
    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  it("shows the loading state", () => {
    setReports([], true);
    renderPage();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("drills into a client and shows the project sheet with derived figures", async () => {
    renderPage();
    await userEvent.click(screen.getByText("Acme Corp"));
    // Project sheet
    expect(
      screen.getByRole("button", { name: "Tower Block" }),
    ).toBeInTheDocument();
    // profit = 10,000 * 20% = 2,000 — appears on the tile and, at the same
    // default (un-overridden) margin, on the per-report simulator row below.
    expect(screen.getAllByText("₪2,000").length).toBeGreaterThanOrEqual(1);
    // subcontractor payment = 10,000 - 2,000 - 0 = 8,000 (shown on the sheet
    // and again in the client-level "Total Sub Payments" header)
    expect(screen.getByText("Bob the Builder")).toBeInTheDocument();
    expect(screen.getAllByText("₪8,000").length).toBeGreaterThanOrEqual(1);
  });

  it("sums the total subcontractor payments for the selected client", async () => {
    renderPage();
    await userEvent.click(screen.getByText("Acme Corp"));
    expect(screen.getByText(/Total Sub Payments/)).toBeInTheDocument();
  });

  // T6 — per-report override. Each report's slider is independent, and
  // dragging one must never move the read-only figures on the tiles above
  // (totalSubcontractorPayments, computed from stored margins) or another
  // report's simulated figures.
  describe("per-report profit simulator (T6)", () => {
    it("defaults every report's slider to its own saved margin", async () => {
      renderPage();
      await userEvent.click(screen.getByText("Acme Corp"));

      const slider = screen.getByRole("slider");
      expect(slider).toHaveValue("20"); // mockReports[0].profitMargin
    });

    it("overriding one report's margin updates only that report's simulated figures", async () => {
      renderPage();
      await userEvent.click(screen.getByText("Acme Corp"));

      const slider = screen.getByRole("slider");
      fireEvent.change(slider, { target: { value: "10" } });

      // 10,000 * 10% = 1,000 profit (appears twice: the per-report row and
      // the aggregate "Simulated Profit" summary, both driven by the same
      // single overridden report); 10,000 - 1,000 - 0 = 9,000 remainder.
      expect(screen.getAllByText("₪1,000").length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText("₪9,000")).toBeInTheDocument();
      expect(screen.getByText("(overridden)")).toBeInTheDocument();

      // The read-only tile above and the client-header total are computed
      // from the *stored* margin (20%) and must not have moved: 10,000 -
      // 2,000 - 0 = 8,000, shown on both the tile and the header total.
      expect(screen.getAllByText("₪8,000").length).toBeGreaterThanOrEqual(2);
    });

    it("resets to saved values", async () => {
      renderPage();
      await userEvent.click(screen.getByText("Acme Corp"));

      const slider = screen.getByRole("slider");
      fireEvent.change(slider, { target: { value: "10" } });
      expect(screen.getByText("(overridden)")).toBeInTheDocument();

      await userEvent.click(
        screen.getByRole("button", { name: "Reset to saved values" }),
      );

      expect(screen.queryByText("(overridden)")).not.toBeInTheDocument();
      expect(slider).toHaveValue("20");
    });

    it("exports with the current overrides via the client-wide simulated endpoint", async () => {
      renderPage();
      await userEvent.click(screen.getByText("Acme Corp"));

      const slider = screen.getByRole("slider");
      fireEvent.change(slider, { target: { value: "10" } });

      await userEvent.click(
        screen.getByRole("button", { name: "Export with Simulator" }),
      );

      expect(exportSimulatedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: "c1",
          overrides: [{ projectId: "p1", margin: 10 }],
        }),
      );
    });
  });

  it("labels each income entry with its own tag", async () => {
    renderPage();
    await userEvent.click(screen.getByText("Acme Corp"));
    expect(screen.getByText("Shell")).toBeInTheDocument();
    expect(screen.getByText("Finishing")).toBeInTheDocument();
  });

  it("exports one report at a time, identified by its own id", async () => {
    renderPage();
    await userEvent.click(screen.getByText("Acme Corp"));
    await userEvent.click(screen.getByRole("button", { name: "Export PDF" }));

    await userEvent.type(
      screen.getByLabelText("Approved For"),
      "Shell + finishing",
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(exportSpy).toHaveBeenCalledWith({
      projectReportId: "r1",
      approvedFor: "Shell + finishing",
      lang: "en",
    });
  });

  it("prefills the export dialog's description from the project and persists edits to it on submit", async () => {
    renderPage();
    await userEvent.click(screen.getByText("Acme Corp"));
    await userEvent.click(screen.getByRole("button", { name: "Export PDF" }));

    const descriptionField = screen.getByLabelText("Description");
    expect(descriptionField).toHaveValue("Shell + finishing work");

    await userEvent.clear(descriptionField);
    await userEvent.type(descriptionField, "Updated scope of work");
    await userEvent.type(screen.getByLabelText("Approved For"), "Approved");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(updateProjectSpy).toHaveBeenCalledWith({
      id: "p1",
      clientId: "c1",
      name: "Tower Block",
      estimatedAmount: 100000,
      description: "Updated scope of work",
      isDone: false,
    });
  });

  it("does not persist an edited description when the dialog is cancelled", async () => {
    renderPage();
    await userEvent.click(screen.getByText("Acme Corp"));
    await userEvent.click(screen.getByRole("button", { name: "Export PDF" }));

    await userEvent.clear(screen.getByLabelText("Description"));
    await userEvent.type(screen.getByLabelText("Description"), "Never saved");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(updateProjectSpy).not.toHaveBeenCalled();
  });

  it("prefills approvedFor from the project's lastApprovedFor on the second export", async () => {
    vi.mocked(useGetProjectsQuery).mockReturnValue({
      data: [
        {
          id: "p1",
          name: "Tower Block",
          clientId: "c1",
          description: "Shell + finishing work",
          estimatedAmount: 100000,
          isDone: false,
          lastApprovedFor: "Shell + finishing (previous export)",
        },
      ],
    } as unknown as ReturnType<typeof useGetProjectsQuery>);

    renderPage();
    await userEvent.click(screen.getByText("Acme Corp"));
    await userEvent.click(screen.getByRole("button", { name: "Export PDF" }));

    expect(screen.getByLabelText("Approved For")).toHaveValue(
      "Shell + finishing (previous export)",
    );
  });

  it("opens the add-report modal", async () => {
    renderPage();
    await userEvent.click(screen.getAllByRole("button", { name: "+ Add" })[0]);
    expect(
      screen.getByRole("heading", { name: "Add Project Reports" }),
    ).toBeInTheDocument();
  });

  // T7 — the tile shows the initiator's name and payment rows purely as
  // informational display, never affecting the subcontractor payment above.
  it("shows the initiator name and payment rows on the tile when the project has one", async () => {
    setReports([
      {
        ...mockReports[0],
        project: { ...mockReports[0].project, initiatorName: "Yaniv Goldman" },
        initiatorPayments: [
          {
            id: "ip1",
            initiator: { id: "init1", name: "Yaniv Goldman" },
            amount: 3000,
            date: null,
            description: "Consulting fee",
          },
        ],
      },
    ]);
    renderPage();
    await userEvent.click(screen.getByText("Acme Corp"));

    expect(screen.getByText(/Yaniv Goldman/)).toBeInTheDocument();
    expect(screen.getByText("Consulting fee")).toBeInTheDocument();
    expect(screen.getByText("₪3,000")).toBeInTheDocument();
    // Unaffected: subcontractor payment is still 10,000 - 2,000 - 0 = 8,000.
    expect(screen.getAllByText("₪8,000").length).toBeGreaterThanOrEqual(1);
  });

  it("shows no initiator section on the tile when the project has no initiator", async () => {
    renderPage();
    await userEvent.click(screen.getByText("Acme Corp"));

    expect(screen.queryByText(/Yaniv Goldman/)).not.toBeInTheDocument();
  });

  // T7 — initiator payment rows only ever appear for a project that actually
  // has an initiator linked. Never enters any calculation.
  describe("initiator payments in the add-report modal (T7)", () => {
    function mockProjectsWithInitiator() {
      vi.mocked(useGetProjectsQuery).mockReturnValue({
        data: [
          {
            id: "p1",
            name: "Tower Block",
            clientId: "c1",
            description: "Shell + finishing work",
            estimatedAmount: 100000,
            isDone: false,
            lastApprovedFor: null,
            initiatorId: null,
          },
          {
            id: "p2",
            name: "Riverside",
            clientId: "c1",
            description: "Riverside project",
            estimatedAmount: 50000,
            isDone: false,
            lastApprovedFor: null,
            initiatorId: "init1",
          },
        ],
      } as unknown as ReturnType<typeof useGetProjectsQuery>);
    }

    it("does not show the initiator payments section for a project with no initiator", async () => {
      mockProjectsWithInitiator();
      renderPage();
      await userEvent.click(
        screen.getAllByRole("button", { name: "+ Add" })[0],
      );
      await userEvent.selectOptions(screen.getByLabelText("Project"), "p1");

      expect(screen.queryByText("Initiator Payments")).not.toBeInTheDocument();
    });

    it("shows the initiator payments section and submits it for a project with an initiator", async () => {
      mockProjectsWithInitiator();
      renderPage();
      await userEvent.click(
        screen.getAllByRole("button", { name: "+ Add" })[0],
      );
      await userEvent.selectOptions(screen.getByLabelText("Project"), "p2");

      expect(screen.getByText("Initiator Payments")).toBeInTheDocument();

      const addButtons = screen.getAllByRole("button", { name: "+ Add" });
      await userEvent.click(addButtons[addButtons.length - 1]);
      const initiatorSelects = screen.getAllByRole("combobox");
      const rowSelect = initiatorSelects[initiatorSelects.length - 1];
      await userEvent.selectOptions(rowSelect, "init1");
      await userEvent.type(screen.getByPlaceholderText("Amount (₪)"), "3000");
      await userEvent.type(screen.getByLabelText("Income (₪)"), "10000");
      await userEvent.click(screen.getByRole("button", { name: "Save" }));

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          initiatorPayments: [
            expect.objectContaining({
              initiatorId: "init1",
              amount: 3000,
            }),
          ],
        }),
      );
    });
  });

  // T13 — total income per client, beside the existing subcontractor total.
  describe("client income total", () => {
    it("shows total income beside total subcontractor payments in the header", async () => {
      renderPage();
      await userEvent.click(screen.getByText("Acme Corp"));

      // Scoped to the client header — "Total Income" also labels a tile row, so
      // a page-wide query would match either and prove nothing about placement.
      const subcontractorTotal = screen.getByText(/Total Sub Payments/);
      const header = subcontractorTotal.closest("div")?.parentElement;
      expect(header).not.toBeNull();
      expect(within(header!).getByText(/Total Income/)).toBeInTheDocument();
    });

    it("totals income across the client's reports for the month", async () => {
      setReports([
        ...mockReports,
        {
          id: "r2",
          date: "2025-03-01",
          project: {
            id: "p2",
            name: "Riverside",
            client: { id: "c1", name: "Acme Corp" },
          },
          subcontractor: { id: "s1", name: "Bob the Builder" },
          totalIncome: 5000,
          profitMargin: 20,
          supplierPayments: [],
          incomeEntries: [
            { id: "ie3", amount: 5000, incomeDate: "2025-03-10", tag: null },
          ],
        },
      ]);
      renderPage();
      await userEvent.click(screen.getByText("Acme Corp"));

      // 10000 + 5000, rendered with he-IL grouping.
      expect(screen.getByText("₪15,000")).toBeInTheDocument();
    });

    it("shows zero rather than blank when the client has no income", async () => {
      setReports([
        {
          ...mockReports[0],
          totalIncome: 0,
          incomeEntries: [],
        },
      ]);
      renderPage();
      await userEvent.click(screen.getByText("Acme Corp"));

      expect(screen.getAllByText("₪0").length).toBeGreaterThan(0);
    });
  });

  it("renders the tile header with project name, location and description, name still clickable", async () => {
    renderPage();
    await userEvent.click(screen.getByText("Acme Corp"));

    const nameButton = screen.getByRole("button", { name: "Tower Block" });
    expect(nameButton).toBeInTheDocument();
    expect(screen.getByText("1 Skyline Ave")).toBeInTheDocument();
    expect(
      screen.getByText("A very tall residential tower"),
    ).toBeInTheDocument();

    // Project name -> location -> description, in DOM order within the tile.
    const header = nameButton.closest("div")!;
    const text = header.textContent ?? "";
    expect(text.indexOf("Tower Block")).toBeLessThan(
      text.indexOf("1 Skyline Ave"),
    );
    expect(text.indexOf("1 Skyline Ave")).toBeLessThan(
      text.indexOf("A very tall residential tower"),
    );
  });

  it("edits an income entry's tag inline on the tile without opening a modal", async () => {
    renderPage();
    await userEvent.click(screen.getByText("Acme Corp"));

    await userEvent.click(screen.getByText("Shell"));
    const tagInput = screen.getByPlaceholderText("e.g. Shell");
    await userEvent.clear(tagInput);
    await userEvent.type(tagInput, "Foundation");
    await userEvent.click(screen.getByRole("button", { name: "Save tag" }));

    expect(updateIncomeEntrySpy).toHaveBeenCalledWith({
      id: "ie1",
      tag: "Foundation",
    });
    // No modal was opened for this edit.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("edits every income entry's tag from the edit-tags modal", async () => {
    renderPage();
    await userEvent.click(screen.getByText("Acme Corp"));

    await userEvent.click(screen.getByRole("button", { name: "Edit Tags" }));
    expect(
      screen.getByRole("heading", { name: /Edit Income Tags/ }),
    ).toBeInTheDocument();

    const tagInputs = screen.getAllByPlaceholderText("e.g. Shell");
    await userEvent.clear(tagInputs[1]);
    await userEvent.type(tagInputs[1], "Roofing");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(updateIncomeEntrySpy).toHaveBeenCalledWith({
      id: "ie2",
      tag: "Roofing",
    });
    // Only the changed row was written.
    expect(updateIncomeEntrySpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: "ie1" }),
    );
  });
});
