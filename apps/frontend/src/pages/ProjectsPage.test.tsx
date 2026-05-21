import { describe, it, expect, vi, beforeEach } from "vitest";
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

import {
  useGetProjectsQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
} from "@/api/endpoints/projects";
import { useGetClientsQuery } from "@/api/endpoints/clients";

const mockProjects = [
  {
    id: "p1",
    name: "Tower Block",
    isDone: false,
    hasReports: true,
    estimatedAmount: 100000,
    paymentProgress: { totalPaid: 50000 },
    client: { id: "c1", name: "Acme Corp" },
    finishDate: null,
    description: null,
  },
  {
    id: "p2",
    name: "Bridge Repair",
    isDone: false,
    hasReports: false,
    estimatedAmount: 20000,
    paymentProgress: null,
    client: null,
    finishDate: null,
    description: null,
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
});
