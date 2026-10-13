import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/renderWithProviders";
import ProjectsPage from "./ProjectsPage";

vi.mock("@/api/endpoints/projects", () => ({
  useGetProjectsQuery: vi.fn(),
  useCreateProjectMutation: vi.fn(),
  useUpdateProjectMutation: vi.fn(),
  useDeleteProjectMutation: vi.fn(),
}));

vi.mock("@/api/endpoints/clients", () => ({
  useGetClientsQuery: vi.fn(),
}));

vi.mock("@/api/endpoints/subcontractors", () => ({
  useGetSubcontractorsQuery: vi.fn(),
  useGetSubcontractorTeamsQuery: vi.fn(() => ({ data: [] })),
}));

vi.mock("@/api/endpoints/initiators", () => ({
  useGetInitiatorsQuery: vi.fn(),
}));

import {
  useGetProjectsQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
} from "@/api/endpoints/projects";
import { useGetClientsQuery } from "@/api/endpoints/clients";
import { useGetSubcontractorsQuery } from "@/api/endpoints/subcontractors";
import { useGetInitiatorsQuery } from "@/api/endpoints/initiators";

const mockProjects = [
  {
    id: "p1",
    name: "Tower Block",
    isDone: false,
    hasReports: true,
    estimatedAmount: 100000,
    paymentProgress: { totalPaid: 50000 },
    client: { id: "c1", name: "Acme Corp" },
    description: "Full renovation",
    requesterName: "Jane Doe",
    location: "123 Main St, Tel Aviv",
  },
  {
    id: "p2",
    name: "Bridge Repair",
    isDone: false,
    hasReports: false,
    estimatedAmount: 20000,
    paymentProgress: null,
    client: { id: "c2", name: "Beta Inc" },
    description: "Deck repair",
    requesterName: "John Smith",
    location: "456 Side St, Haifa",
  },
];

const noopMutation = vi
  .fn()
  .mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });

function renderProjectsPage() {
  return renderWithProviders(<ProjectsPage />, {
    preloadedState: { auth: { token: "test-token" } },
  });
}

describe("ProjectsPage", () => {
  beforeEach(() => {
    vi.mocked(useGetProjectsQuery).mockReturnValue({
      data: mockProjects,
      isLoading: false,
    } as unknown as ReturnType<typeof useGetProjectsQuery>);
    vi.mocked(useGetClientsQuery).mockReturnValue({
      data: [{ id: "c1", name: "Acme Corp" }],
      isLoading: false,
    } as unknown as ReturnType<typeof useGetClientsQuery>);
    vi.mocked(useGetSubcontractorsQuery).mockReturnValue({
      data: [{ id: "s1", name: "Dan Levi", companyNumber: "515222020" }],
      isLoading: false,
    } as unknown as ReturnType<typeof useGetSubcontractorsQuery>);
    vi.mocked(useGetInitiatorsQuery).mockReturnValue({
      data: [{ id: "init1", name: "Yaniv Goldman" }],
      isLoading: false,
    } as unknown as ReturnType<typeof useGetInitiatorsQuery>);
    vi.mocked(useCreateProjectMutation).mockReturnValue([
      noopMutation,
      { isLoading: false },
    ] as unknown as ReturnType<typeof useCreateProjectMutation>);
    vi.mocked(useUpdateProjectMutation).mockReturnValue([
      noopMutation,
      { isLoading: false },
    ] as unknown as ReturnType<typeof useUpdateProjectMutation>);
    vi.mocked(useDeleteProjectMutation).mockReturnValue([
      noopMutation,
      { isLoading: false },
    ] as unknown as ReturnType<typeof useDeleteProjectMutation>);
  });

  it("renders page title", () => {
    renderProjectsPage();
    expect(
      screen.getByRole("heading", { name: "Projects" }),
    ).toBeInTheDocument();
  });

  it("renders filter toggle buttons", () => {
    renderProjectsPage();
    expect(screen.getByRole("button", { name: "Active" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Future" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Closed" })).toBeInTheDocument();
  });

  it("renders active projects by default (active filter on)", () => {
    renderProjectsPage();
    expect(screen.getByText("Tower Block")).toBeInTheDocument();
  });

  it("does not show future projects when only active filter is on", () => {
    renderProjectsPage();
    expect(screen.queryByText("Bridge Repair")).not.toBeInTheDocument();
  });

  it("shows future project after toggling future filter", async () => {
    renderProjectsPage();
    await userEvent.click(screen.getByRole("button", { name: "Future" }));
    expect(screen.getByText("Bridge Repair")).toBeInTheDocument();
  });

  it("shows completion percentage", () => {
    renderProjectsPage();
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("shows status badge", () => {
    renderProjectsPage();
    expect(screen.getAllByText("Active").length).toBeGreaterThanOrEqual(1);
  });

  it("shows client name in table", () => {
    renderProjectsPage();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("opens add project modal when add button clicked", async () => {
    renderProjectsPage();
    await userEvent.click(screen.getByRole("button", { name: /add project/i }));
    expect(screen.getByText("Add Project")).toBeInTheDocument();
  });

  it("opens edit modal when edit button clicked", async () => {
    renderProjectsPage();
    await userEvent.click(screen.getAllByTitle("Edit")[0]);
    expect(screen.getByText("Edit Project")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Tower Block")).toBeInTheDocument();
  });

  it("opens delete confirm modal when delete button clicked", async () => {
    renderProjectsPage();
    await userEvent.click(screen.getAllByTitle("Delete")[0]);
    expect(screen.getByText(/permanently delete/i)).toBeInTheDocument();
  });

  it("renders a search box", () => {
    renderProjectsPage();
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
  });

  it("filters projects by name", async () => {
    renderProjectsPage();
    await userEvent.click(screen.getByRole("button", { name: "Future" }));
    await userEvent.type(screen.getByRole("searchbox"), "Tower");
    expect(screen.getByText("Tower Block")).toBeInTheDocument();
    expect(screen.queryByText("Bridge Repair")).not.toBeInTheDocument();
  });

  it("filters projects by client name", async () => {
    renderProjectsPage();
    await userEvent.click(screen.getByRole("button", { name: "Future" }));
    await userEvent.type(screen.getByRole("searchbox"), "Acme");
    expect(screen.getByText("Tower Block")).toBeInTheDocument();
    expect(screen.queryByText("Bridge Repair")).not.toBeInTheDocument();
  });

  it("matches search case-insensitively and ignores surrounding spaces", async () => {
    renderProjectsPage();
    await userEvent.type(screen.getByRole("searchbox"), "  tOwEr  ");
    expect(screen.getByText("Tower Block")).toBeInTheDocument();
  });

  it("applies search on top of status filters", async () => {
    renderProjectsPage();
    // "Bridge Repair" is a future project, hidden by the default Active filter
    await userEvent.type(screen.getByRole("searchbox"), "Bridge");
    expect(screen.queryByText("Bridge Repair")).not.toBeInTheDocument();
    expect(screen.getByText("No results")).toBeInTheDocument();
  });

  it("shows no results empty state when search has no matches", async () => {
    renderProjectsPage();
    await userEvent.type(screen.getByRole("searchbox"), "zzz");
    expect(screen.getByText("No results")).toBeInTheDocument();
    expect(
      screen.queryByText("No projects match selected filters"),
    ).not.toBeInTheDocument();
  });

  it("restores rows when the search box is cleared", async () => {
    renderProjectsPage();
    const box = screen.getByRole("searchbox");
    await userEvent.type(box, "zzz");
    expect(screen.queryByText("Tower Block")).not.toBeInTheDocument();
    await userEvent.clear(box);
    expect(screen.getByText("Tower Block")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    vi.mocked(useGetProjectsQuery).mockReturnValue({
      data: [],
      isLoading: true,
    } as unknown as ReturnType<typeof useGetProjectsQuery>);
    renderProjectsPage();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows empty state when no projects match filters", () => {
    vi.mocked(useGetProjectsQuery).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useGetProjectsQuery>);
    renderProjectsPage();
    expect(
      screen.getByText("No projects match selected filters"),
    ).toBeInTheDocument();
  });

  describe("opening balance", () => {
    const createSpy = vi.fn().mockResolvedValue({ data: { id: "new" } });

    beforeEach(() => {
      createSpy.mockClear();
      vi.mocked(useCreateProjectMutation).mockReturnValue([
        createSpy,
        { isLoading: false },
      ] as unknown as ReturnType<typeof useCreateProjectMutation>);
    });

    async function openAddForm() {
      await userEvent.click(
        screen.getByRole("button", { name: /add project/i }),
      );
    }

    async function openOpeningSection() {
      await userEvent.click(
        screen.getByRole("button", { name: /already received/i }),
      );
    }

    async function fillRequiredFields() {
      await userEvent.type(screen.getByLabelText("Name"), "New Project");
      await userEvent.type(screen.getByLabelText(/Estimated Amount/i), "80000");
      await userEvent.selectOptions(screen.getByLabelText("Client"), "c1");
      await userEvent.type(screen.getByLabelText("Requester"), "New Requester");
      await userEvent.type(screen.getByLabelText("Location"), "New Location");
      await userEvent.type(screen.getByLabelText("Description"), "Desc");
    }

    // Only used to import pre-BeetBite data, so it must not crowd the form
    // for everyday project creation.
    it("offers the section collapsed when adding a project", async () => {
      renderProjectsPage();
      await openAddForm();
      const toggle = screen.getByRole("button", { name: /already received/i });
      expect(toggle).toHaveAttribute("aria-expanded", "false");
      expect(
        screen.queryByLabelText("Amount already received"),
      ).not.toBeInTheDocument();

      await userEvent.click(toggle);
      expect(toggle).toHaveAttribute("aria-expanded", "true");
      expect(
        screen.getByLabelText("Amount already received"),
      ).toBeInTheDocument();
    });

    it("collapses again on a second click", async () => {
      renderProjectsPage();
      await openAddForm();
      await openOpeningSection();
      await openOpeningSection();
      expect(
        screen.queryByLabelText("Amount already received"),
      ).not.toBeInTheDocument();
    });

    // There is nothing to back-date once the project is already in the system
    // and has reports of its own.
    it("does not offer the section when editing", async () => {
      renderProjectsPage();
      await userEvent.click(screen.getAllByTitle("Edit")[0]);
      expect(
        screen.queryByRole("button", { name: /already received/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByLabelText("Amount already received"),
      ).not.toBeInTheDocument();
    });

    // 🔴 The section is optional. Leaving it alone must send no openingBalance
    // at all — sending an empty one would create a bogus report.
    it("sends no opening balance when the section is left empty", async () => {
      renderProjectsPage();
      await openAddForm();
      await fillRequiredFields();
      await userEvent.click(screen.getByRole("button", { name: /save/i }));

      expect(createSpy).toHaveBeenCalledTimes(1);
      const payload = createSpy.mock.calls[0][0] as Record<string, unknown>;
      expect(payload).not.toHaveProperty("openingBalance");
    });

    it("sends the opening balance when every field is filled", async () => {
      renderProjectsPage();
      await openAddForm();
      await fillRequiredFields();
      await openOpeningSection();

      await userEvent.type(
        screen.getByLabelText("Amount already received"),
        "45000",
      );
      await userEvent.clear(screen.getByLabelText("Month it covers"));
      await userEvent.type(screen.getByLabelText("Month it covers"), "2026-03");
      await userEvent.selectOptions(
        screen.getByLabelText("Subcontractor"),
        "s1",
      );
      await userEvent.type(screen.getByLabelText("Profit Margin"), "12.5");
      await userEvent.click(screen.getByRole("button", { name: /save/i }));

      expect(createSpy).toHaveBeenCalledTimes(1);
      const payload = createSpy.mock.calls[0][0] as {
        openingBalance: {
          amount: number;
          month: string;
          subcontractorId: string;
          profitMargin: number;
        };
      };
      expect(payload.openingBalance).toEqual({
        amount: 45000,
        month: "2026-03-01",
        subcontractorId: "s1",
        profitMargin: 12.5,
      });
    });

    // 🔴 ProjectReport requires a subcontractor and a profit margin, so a
    // half-filled section cannot become a report. Submitting it anyway would
    // fail at the API with nothing on screen explaining why.
    it("blocks submit and explains when the section is half-filled", async () => {
      renderProjectsPage();
      await openAddForm();
      await fillRequiredFields();
      await openOpeningSection();
      await userEvent.type(
        screen.getByLabelText("Amount already received"),
        "45000",
      );
      await userEvent.click(screen.getByRole("button", { name: /save/i }));

      expect(createSpy).not.toHaveBeenCalled();
      expect(screen.getByRole("alert")).toHaveTextContent(
        /month, subcontractor and profit margin/i,
      );
    });

    // 🔴 The warning lives inside the section. If the user half-fills it and
    // folds it away, a silent blocked submit would leave nothing on screen
    // explaining why Save did nothing.
    it("reopens a collapsed half-filled section on submit", async () => {
      renderProjectsPage();
      await openAddForm();
      await fillRequiredFields();
      await openOpeningSection();
      await userEvent.type(
        screen.getByLabelText("Amount already received"),
        "45000",
      );
      await openOpeningSection();
      expect(
        screen.queryByLabelText("Amount already received"),
      ).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: /save/i }));

      expect(createSpy).not.toHaveBeenCalled();
      expect(screen.getByRole("alert")).toHaveTextContent(
        /month, subcontractor and profit margin/i,
      );
      expect(screen.getByLabelText("Amount already received")).toHaveValue(
        45000,
      );
    });

    it("starts collapsed again after the form is closed and reopened", async () => {
      renderProjectsPage();
      await openAddForm();
      await openOpeningSection();
      await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
      await openAddForm();
      expect(
        screen.queryByLabelText("Amount already received"),
      ).not.toBeInTheDocument();
    });
  });

  it("shows the requester in the table", () => {
    renderProjectsPage();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
  });

  it("does not render a 'no client' option in the client select", async () => {
    renderProjectsPage();
    await userEvent.click(screen.getByRole("button", { name: /add project/i }));
    expect(screen.queryByText("— No client —")).not.toBeInTheDocument();
  });

  it("requires a requester name before saving", async () => {
    renderProjectsPage();
    await userEvent.click(screen.getByRole("button", { name: /add project/i }));
    const requesterInput = screen.getByLabelText("Requester");
    expect(requesterInput).toBeRequired();
  });

  it("requires a location before saving", async () => {
    renderProjectsPage();
    await userEvent.click(screen.getByRole("button", { name: /add project/i }));
    const locationInput = screen.getByLabelText("Location");
    expect(locationInput).toBeRequired();
  });

  it("offers previously used requester names via datalist, while still accepting a new value", async () => {
    renderProjectsPage();
    await userEvent.click(screen.getByRole("button", { name: /add project/i }));
    const requesterInput = screen.getByLabelText("Requester");

    const datalist = document.getElementById(
      requesterInput.getAttribute("list")!,
    );
    expect(datalist).not.toBeNull();
    const optionValues = Array.from(datalist!.querySelectorAll("option")).map(
      (o) => o.value,
    );
    expect(optionValues).toEqual(
      expect.arrayContaining(["Jane Doe", "John Smith"]),
    );

    await userEvent.type(requesterInput, "A Brand New Requester");
    expect(requesterInput).toHaveValue("A Brand New Requester");
  });

  it("prefills requester and location when editing an existing project", async () => {
    renderProjectsPage();
    await userEvent.click(screen.getAllByTitle("Edit")[0]);
    expect(screen.getByDisplayValue("Jane Doe")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("123 Main St, Tel Aviv"),
    ).toBeInTheDocument();
  });

  // The client is a history of assignments, changed only by a transfer from a
  // chosen month. Editing it here would move the cached client alone and leave
  // every month-scoped screen on the old one.
  describe("client on an existing project", () => {
    it("leaves the client selectable when adding a project", async () => {
      renderProjectsPage();
      await userEvent.click(
        screen.getByRole("button", { name: /add project/i }),
      );

      expect(screen.getByLabelText("Client")).toBeEnabled();
      expect(
        screen.queryByText(/to change the client, use transfer/i),
      ).not.toBeInTheDocument();
    });

    it("locks the client when editing and points to the transfer", async () => {
      renderProjectsPage();
      await userEvent.click(screen.getAllByTitle("Edit")[0]);

      const select = screen.getByLabelText("Client");
      expect(select).toBeDisabled();
      expect(select).toHaveValue("c1");
      expect(
        screen.getByText(/to change the client, use transfer/i),
      ).toBeInTheDocument();
    });

    it("saves an edit with the project's current client unchanged", async () => {
      noopMutation.mockClear();
      renderProjectsPage();
      await userEvent.click(screen.getAllByTitle("Edit")[0]);
      await userEvent.clear(screen.getByLabelText("Name"));
      await userEvent.type(screen.getByLabelText("Name"), "Tower Block II");
      await userEvent.click(screen.getByRole("button", { name: /save/i }));

      expect(noopMutation).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "p1",
          name: "Tower Block II",
          clientId: "c1",
        }),
      );
    });
  });

  // Initiator link is optional; the select defaults to "none" and lists
  // every managed initiator.
  describe("initiator link", () => {
    it("offers a 'no initiator' option plus every initiator", async () => {
      renderProjectsPage();
      await userEvent.click(
        screen.getByRole("button", { name: /add project/i }),
      );

      const select = screen.getByLabelText("Initiator");
      expect(select).toHaveValue("");
      expect(screen.getByText("— No initiator —")).toBeInTheDocument();
      expect(screen.getByText("Yaniv Goldman")).toBeInTheDocument();
    });

    it("sends the selected initiatorId when creating a project", async () => {
      renderProjectsPage();
      await userEvent.click(
        screen.getByRole("button", { name: /add project/i }),
      );

      await userEvent.type(screen.getByLabelText("Name"), "New Project");
      await userEvent.type(screen.getByLabelText(/Estimated Amount/i), "80000");
      await userEvent.selectOptions(screen.getByLabelText("Client"), "c1");
      await userEvent.type(screen.getByLabelText("Requester"), "Someone");
      await userEvent.type(screen.getByLabelText("Location"), "Somewhere");
      await userEvent.type(screen.getByLabelText("Description"), "Desc");
      await userEvent.selectOptions(
        screen.getByLabelText("Initiator"),
        "init1",
      );
      await userEvent.click(screen.getByRole("button", { name: /save/i }));

      expect(noopMutation).toHaveBeenCalledWith(
        expect.objectContaining({ initiatorId: "init1" }),
      );
    });

    it("sends null initiatorId when left as 'no initiator'", async () => {
      renderProjectsPage();
      await userEvent.click(
        screen.getByRole("button", { name: /add project/i }),
      );

      await userEvent.type(screen.getByLabelText("Name"), "New Project");
      await userEvent.type(screen.getByLabelText(/Estimated Amount/i), "80000");
      await userEvent.selectOptions(screen.getByLabelText("Client"), "c1");
      await userEvent.type(screen.getByLabelText("Requester"), "Someone");
      await userEvent.type(screen.getByLabelText("Location"), "Somewhere");
      await userEvent.type(screen.getByLabelText("Description"), "Desc");
      await userEvent.click(screen.getByRole("button", { name: /save/i }));

      expect(noopMutation).toHaveBeenCalledWith(
        expect.objectContaining({ initiatorId: null }),
      );
    });

    it("prefills the initiator select when editing a project that has one", async () => {
      vi.mocked(useGetProjectsQuery).mockReturnValue({
        data: [{ ...mockProjects[0], initiatorId: "init1" }],
        isLoading: false,
      } as unknown as ReturnType<typeof useGetProjectsQuery>);

      renderProjectsPage();
      await userEvent.click(screen.getAllByTitle("Edit")[0]);

      expect(screen.getByLabelText("Initiator")).toHaveValue("init1");
    });

    it("saves an initiator set on an existing project", async () => {
      noopMutation.mockClear();
      renderProjectsPage();
      await userEvent.click(screen.getAllByTitle("Edit")[0]);
      await userEvent.selectOptions(
        screen.getByLabelText("Initiator"),
        "init1",
      );
      await userEvent.click(screen.getByRole("button", { name: /save/i }));

      expect(noopMutation).toHaveBeenCalledWith(
        expect.objectContaining({ id: "p1", initiatorId: "init1" }),
      );
    });
  });

  // The backend requires a description; leaving it blank used to send the
  // request anyway and fail with nothing pointing at the field.
  it("names a blank description before sending a new project", async () => {
    noopMutation.mockClear();
    renderProjectsPage();
    await userEvent.click(screen.getByRole("button", { name: /add project/i }));
    await userEvent.type(screen.getByLabelText("Name"), "New Project");
    await userEvent.type(screen.getByLabelText(/Estimated Amount/i), "80000");
    await userEvent.selectOptions(screen.getByLabelText("Client"), "c1");
    await userEvent.type(screen.getByLabelText("Requester"), "Someone");
    await userEvent.type(screen.getByLabelText("Location"), "Somewhere");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(noopMutation).not.toHaveBeenCalled();
    expect(
      await screen.findByText("Fill in the required fields: Description"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  // Projects created before requester and location existed have both stored
  // as empty strings, so a save used to be refused without any feedback.
  describe("blocked save", () => {
    beforeEach(() => {
      vi.mocked(useGetProjectsQuery).mockReturnValue({
        data: [{ ...mockProjects[0], requesterName: "", location: "" }],
        isLoading: false,
      } as unknown as ReturnType<typeof useGetProjectsQuery>);
      noopMutation.mockClear();
    });

    it("says which required fields are missing instead of doing nothing", async () => {
      renderProjectsPage();
      await userEvent.click(screen.getAllByTitle("Edit")[0]);
      await userEvent.selectOptions(
        screen.getByLabelText("Initiator"),
        "init1",
      );
      await userEvent.click(screen.getByRole("button", { name: /save/i }));

      expect(noopMutation).not.toHaveBeenCalled();
      expect(
        await screen.findByText(
          "Fill in the required fields: Requester, Location",
        ),
      ).toBeInTheDocument();
      expect(screen.getByLabelText("Requester")).toHaveAttribute(
        "aria-invalid",
        "true",
      );
      expect(screen.getByLabelText("Location")).toHaveAttribute(
        "aria-invalid",
        "true",
      );
      expect(screen.getByLabelText("Name")).not.toHaveAttribute("aria-invalid");
    });

    it("saves once the missing fields are filled in", async () => {
      renderProjectsPage();
      await userEvent.click(screen.getAllByTitle("Edit")[0]);
      await userEvent.selectOptions(
        screen.getByLabelText("Initiator"),
        "init1",
      );
      await userEvent.type(screen.getByLabelText("Requester"), "Jane Doe");
      await userEvent.type(screen.getByLabelText("Location"), "Tel Aviv");
      await userEvent.click(screen.getByRole("button", { name: /save/i }));

      expect(noopMutation).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "p1",
          initiatorId: "init1",
          requesterName: "Jane Doe",
          location: "Tel Aviv",
        }),
      );
    });
  });
});
