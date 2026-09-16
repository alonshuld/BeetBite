import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/renderWithProviders";
import { ProjectTransferModal } from "./ProjectTransferModal";

vi.mock("@/api/endpoints/project-client-assignments", () => ({
  useGetProjectClientAssignmentsQuery: vi.fn(),
  useTransferProjectMutation: vi.fn(),
  useDeleteProjectClientAssignmentMutation: vi.fn(),
}));
vi.mock("@/api/endpoints/clients", () => ({ useGetClientsQuery: vi.fn() }));

import {
  useGetProjectClientAssignmentsQuery,
  useTransferProjectMutation,
  useDeleteProjectClientAssignmentMutation,
} from "@/api/endpoints/project-client-assignments";
import { useGetClientsQuery } from "@/api/endpoints/clients";

const PROJECT = { id: "p1", name: "Tower Block", clientId: "c2" };

const TIMELINE = [
  {
    id: "a1",
    projectId: "p1",
    clientId: "c1",
    clientName: "Acme Corp",
    effectiveFrom: "1970-01-01T00:00:00.000Z",
  },
  {
    id: "a2",
    projectId: "p1",
    clientId: "c2",
    clientName: "Beta Builders",
    effectiveFrom: "2026-03-01T00:00:00.000Z",
  },
];

const transferSpy = vi.fn().mockResolvedValue({ data: TIMELINE });
const removeSpy = vi.fn().mockResolvedValue({ data: TIMELINE });

function setTimeline(data: unknown) {
  vi.mocked(useGetProjectClientAssignmentsQuery).mockReturnValue({
    data,
  } as unknown as ReturnType<typeof useGetProjectClientAssignmentsQuery>);
}

function renderModal(project: typeof PROJECT | null = PROJECT) {
  return renderWithProviders(
    <ProjectTransferModal project={project} onClose={vi.fn()} />,
    { preloadedState: { auth: { token: "test-token" } } },
  );
}

describe("ProjectTransferModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setTimeline(TIMELINE);
    vi.mocked(useGetClientsQuery).mockReturnValue({
      data: [
        { id: "c1", name: "Acme Corp" },
        { id: "c2", name: "Beta Builders" },
        { id: "c3", name: "Gamma Group" },
      ],
    } as unknown as ReturnType<typeof useGetClientsQuery>);
    vi.mocked(useTransferProjectMutation).mockReturnValue([
      transferSpy,
      { isLoading: false },
    ] as unknown as ReturnType<typeof useTransferProjectMutation>);
    vi.mocked(useDeleteProjectClientAssignmentMutation).mockReturnValue([
      removeSpy,
      { isLoading: false },
    ] as unknown as ReturnType<
      typeof useDeleteProjectClientAssignmentMutation
    >);
  });

  it("renders nothing when no project is selected", () => {
    renderModal(null);
    expect(screen.queryByText(/Transfer to another client/)).toBeNull();
  });

  it("shows the ownership timeline so a wrong month is visible", () => {
    renderModal();

    // Scoped to the timeline — both client names also appear as picker options.
    const heading = screen.getByText("Ownership timeline");
    const timeline = within(heading.parentElement!);

    expect(timeline.getByText(/Acme Corp/)).toBeInTheDocument();
    expect(timeline.getByText(/Beta Builders/)).toBeInTheDocument();
    // The earlier owner is bounded by the next assignment's month; the current
    // owner runs to date.
    expect(timeline.getByText(/until/)).toBeInTheDocument();
    expect(timeline.getByText(/to date/)).toBeInTheDocument();
  });

  // Every project must always keep a first assignment — without one it resolves
  // to no client and disappears from every month-scoped view. The backend
  // refuses; the UI should not offer it either.
  it("offers no remove control for the earliest assignment", () => {
    renderModal();

    const removeButtons = screen.getAllByTitle("Remove this transfer");
    expect(removeButtons).toHaveLength(TIMELINE.length - 1);
  });

  it("removes a later assignment when asked", async () => {
    renderModal();

    await userEvent.click(screen.getByTitle("Remove this transfer"));

    expect(removeSpy).toHaveBeenCalledWith("a2");
  });

  it("excludes the project's current client from the picker", () => {
    renderModal();

    const select = screen.getByLabelText(/New client/);
    const values = within(select)
      .getAllByRole("option")
      .map((option) => option.getAttribute("value"));
    expect(values).not.toContain("c2");
    expect(values).toContain("c1");
    expect(values).toContain("c3");
  });

  it("submits the chosen month normalised to its first day", async () => {
    renderModal();

    await userEvent.selectOptions(screen.getByLabelText(/New client/), "c3");
    const monthInput = screen.getByLabelText(/From month/);
    await userEvent.clear(monthInput);
    await userEvent.type(monthInput, "2026-07");

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(transferSpy).toHaveBeenCalledWith({
      projectId: "p1",
      clientId: "c3",
      effectiveFrom: "2026-07-01",
    });
  });

  it("does not submit without a target client", async () => {
    renderModal();

    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(transferSpy).not.toHaveBeenCalled();
  });
});
