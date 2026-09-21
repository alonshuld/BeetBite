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

  // The simulator rail. A master slider drives every project at once;
  // moving one project's own slider pins it, so later master moves leave it
  // alone. Everything the simulation touches (sheets, client header) moves
  // together; nothing is ever written back.
  describe("profit simulator", () => {
    const secondReport = {
      id: "r2",
      date: "2025-03-01",
      project: {
        id: "p2",
        name: "Riverside",
        description: "Low-rise block",
        location: "2 River Rd",
        requesterName: "Jane Doe",
        client: { id: "c1", name: "Acme Corp" },
      },
      subcontractor: { id: "s2", name: "Alice Mason" },
      totalIncome: 20000,
      profitMargin: 16,
      supplierPayments: [],
      incomeEntries: [
        { id: "ie3", amount: 20000, incomeDate: "2025-03-12", tag: "Shell" },
      ],
    };

    /** [master, ...one per project] — the drawer renders them in that order. */
    function sliders() {
      return screen.getAllByRole("slider");
    }

    /** The drawer is closed by default; every slider test opens it first. */
    async function openSimulator() {
      await userEvent.click(
        screen.getByRole("button", { name: "Profit Simulator" }),
      );
    }

    it("stays closed until the bookmark tab is used, and shows stored figures", async () => {
      renderPage();
      await userEvent.click(screen.getByText("Acme Corp"));

      expect(screen.queryByRole("slider")).not.toBeInTheDocument();
      expect(screen.queryByText("Simulated")).not.toBeInTheDocument();
      // 10,000 − 2,000 (saved 20%) = 8,000 on the sheet and in the header.
      expect(screen.getAllByText("₪8,000").length).toBeGreaterThanOrEqual(2);

      await openSimulator();
      expect(screen.getAllByRole("slider").length).toBe(2);
    });

    it("ends the simulation when the drawer is closed", async () => {
      renderPage();
      await userEvent.click(screen.getByText("Acme Corp"));
      await openSimulator();

      fireEvent.change(sliders()[1], { target: { value: "10" } });
      expect(screen.getAllByText("Simulated").length).toBeGreaterThanOrEqual(1);

      // The same bookmark tab that opened it closes it — there is no ✕.
      await userEvent.click(
        screen.getByRole("button", { name: "Profit Simulator" }),
      );

      expect(screen.queryByRole("slider")).not.toBeInTheDocument();
      expect(screen.queryByText("Simulated")).not.toBeInTheDocument();
      // Back to the stored 20%: 10,000 − 2,000 = 8,000.
      expect(screen.getAllByText("₪8,000").length).toBeGreaterThanOrEqual(2);

      // Re-opening starts clean, at the saved margin.
      await openSimulator();
      expect(sliders()[1]).toHaveValue("20");
    });

    it("defaults every project's slider to its own saved margin", async () => {
      renderPage();
      await userEvent.click(screen.getByText("Acme Corp"));
      await openSimulator();

      const [master, projectSlider] = sliders();
      expect(projectSlider).toHaveValue("20"); // mockReports[0].profitMargin
      // Sole report, so the average the master starts at is that same margin.
      expect(master).toHaveValue("20");
    });

    it("the master slider moves every project at once", async () => {
      setReports([...mockReports, secondReport]);
      renderPage();
      await userEvent.click(screen.getByText("Acme Corp"));
      await openSimulator();

      const [master, first, second] = sliders();
      // Average of 20% and 16% until moved.
      expect(master).toHaveValue("18");

      fireEvent.change(master, { target: { value: "10" } });

      expect(first).toHaveValue("10");
      expect(second).toHaveValue("10");
      // 10,000 × 10% + 20,000 × 10% = 3,000 simulated profit.
      expect(screen.getByText("₪3,000")).toBeInTheDocument();
    });

    it("pins a project against later master moves once its own slider is used", async () => {
      setReports([...mockReports, secondReport]);
      renderPage();
      await userEvent.click(screen.getByText("Acme Corp"));
      await openSimulator();

      const [master, first, second] = sliders();
      fireEvent.change(second, { target: { value: "15" } });
      fireEvent.change(master, { target: { value: "10" } });

      expect(first).toHaveValue("10");
      expect(second).toHaveValue("15");
      expect(screen.getByText("(overridden)")).toBeInTheDocument();
    });

    it("overriding one project's margin leaves the other project alone", async () => {
      setReports([...mockReports, secondReport]);
      renderPage();
      await userEvent.click(screen.getByText("Acme Corp"));
      await openSimulator();

      const [, first, second] = sliders();
      fireEvent.change(first, { target: { value: "10" } });

      expect(second).toHaveValue("16");
      // 10,000 × 10% = 1,000 for the overridden project; the other keeps its
      // saved 20,000 × 16% = 3,200.
      expect(screen.getAllByText("₪1,000").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("₪3,200").length).toBeGreaterThanOrEqual(1);
    });

    it("shows the simulated figures on the project sheet, with the saved ones beside them", async () => {
      renderPage();
      await userEvent.click(screen.getByText("Acme Corp"));
      await openSimulator();

      const [, projectSlider] = sliders();
      fireEvent.change(projectSlider, { target: { value: "10" } });

      const sheet = screen
        .getByRole("button", { name: "Tower Block" })
        .closest("div.bg-surface") as HTMLElement;
      // Simulated: 10,000 × 10% = 1,000 profit, 9,000 left for the
      // subcontractor. The saved 20% figure stays visible underneath.
      expect(within(sheet).getByText("Profit (10%)")).toBeInTheDocument();
      expect(within(sheet).getByText("₪1,000")).toBeInTheDocument();
      expect(within(sheet).getByText("₪9,000")).toBeInTheDocument();
      expect(
        within(sheet).getByText(/Saved margin:\s*20%/),
      ).toBeInTheDocument();
      expect(within(sheet).getByText("₪2,000")).toBeInTheDocument();
      expect(within(sheet).getByText("Simulated")).toBeInTheDocument();
    });

    it("moves the client header total with the simulation", async () => {
      renderPage();
      await userEvent.click(screen.getByText("Acme Corp"));
      await openSimulator();

      const header = screen
        .getByText(/Total Sub Payments/)
        .closest("div") as HTMLElement;
      expect(within(header).getByText("₪8,000")).toBeInTheDocument();

      const [, projectSlider] = sliders();
      fireEvent.change(projectSlider, { target: { value: "10" } });

      expect(within(header).getByText("₪9,000")).toBeInTheDocument();
    });

    it("resets to saved values", async () => {
      renderPage();
      await userEvent.click(screen.getByText("Acme Corp"));
      await openSimulator();

      const [, projectSlider] = sliders();
      fireEvent.change(projectSlider, { target: { value: "10" } });
      expect(screen.getByText("(overridden)")).toBeInTheDocument();

      await userEvent.click(
        screen.getByRole("button", { name: "Reset to saved values" }),
      );

      expect(screen.queryByText("(overridden)")).not.toBeInTheDocument();
      expect(projectSlider).toHaveValue("20");
    });

    it("exports with the current overrides via the client-wide simulated endpoint", async () => {
      renderPage();
      await userEvent.click(screen.getByText("Acme Corp"));
      await openSimulator();

      const [, projectSlider] = sliders();
      fireEvent.change(projectSlider, { target: { value: "10" } });

      await userEvent.click(
        screen.getByRole("button", { name: "Export Simulation PDF" }),
      );

      expect(exportSimulatedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: "c1",
          overrides: [{ projectId: "p1", margin: 10 }],
        }),
      );
    });

    it("takes a margin above the slider's range from the number box", async () => {
      renderPage();
      await userEvent.click(screen.getByText("Acme Corp"));
      await openSimulator();

      const box = screen.getByRole("spinbutton", { name: "Tower Block %" });
      fireEvent.change(box, { target: { value: "60" } });

      expect(box).toHaveValue(60);
      // The slider only spans 0–20, so its thumb parks at the top.
      expect(sliders()[1]).toHaveValue("20");
      // 10,000 × 60% = 6,000 profit, 4,000 left for the subcontractor.
      expect(screen.getAllByText("₪6,000").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("₪4,000").length).toBeGreaterThanOrEqual(1);
    });

    it("sends no overrides for a project left at its saved margin", async () => {
      setReports([...mockReports, secondReport]);
      renderPage();
      await userEvent.click(screen.getByText("Acme Corp"));
      await openSimulator();

      const [, first] = sliders();
      // Explicitly re-selecting the saved margin is not an override.
      fireEvent.change(first, { target: { value: "20" } });

      await userEvent.click(
        screen.getByRole("button", { name: "Export Simulation PDF" }),
      );

      expect(exportSimulatedSpy).toHaveBeenCalledWith(
        expect.objectContaining({ overrides: [] }),
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
      description: "Shell + finishing work",
      lang: "en",
    });
  });

  it("prefills the export dialog's description from the project and sends edits to it with the export alone", async () => {
    renderPage();
    await userEvent.click(screen.getByText("Acme Corp"));
    await userEvent.click(screen.getByRole("button", { name: "Export PDF" }));

    const descriptionField = screen.getByLabelText("Description");
    expect(descriptionField).toHaveValue("Shell + finishing work");

    await userEvent.clear(descriptionField);
    await userEvent.type(descriptionField, "Updated scope of work");
    await userEvent.type(screen.getByLabelText("Approved For"), "Approved");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(exportSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        projectReportId: "r1",
        description: "Updated scope of work",
      }),
    );
    // The description is printed on this one document only — the project
    // record is untouched.
    expect(updateProjectSpy).not.toHaveBeenCalled();
  });

  it("exports nothing when the dialog is cancelled", async () => {
    renderPage();
    await userEvent.click(screen.getByText("Acme Corp"));
    await userEvent.click(screen.getByRole("button", { name: "Export PDF" }));

    await userEvent.clear(screen.getByLabelText("Description"));
    await userEvent.type(screen.getByLabelText("Description"), "Never saved");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(exportSpy).not.toHaveBeenCalled();
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

  // The tile shows the initiator's name and payment rows purely as
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

  // Initiator payment rows only ever appear for a project that actually
  // has an initiator linked. Never enters any calculation.
  describe("initiator payments in the add-report modal", () => {
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

  // Total income per client, beside the existing subcontractor total.
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

  it("gives each income entry its own inline editor, writing only the edited one", async () => {
    renderPage();
    await userEvent.click(screen.getByText("Acme Corp"));

    await userEvent.click(screen.getByText("Finishing"));
    const tagInput = screen.getByPlaceholderText("e.g. Shell");
    await userEvent.clear(tagInput);
    await userEvent.type(tagInput, "Roofing");
    await userEvent.click(screen.getByRole("button", { name: "Save tag" }));

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
