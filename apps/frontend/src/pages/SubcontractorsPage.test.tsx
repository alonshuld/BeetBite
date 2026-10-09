import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/renderWithProviders";
import SubcontractorsPage from "./SubcontractorsPage";

vi.mock("@/api/endpoints/subcontractors", () => ({
  useGetSubcontractorsQuery: vi.fn(),
  useCreateSubcontractorMutation: vi.fn(),
  useUpdateSubcontractorMutation: vi.fn(),
  useDeleteSubcontractorMutation: vi.fn(),
  useGetSubcontractorTeamsQuery: vi.fn(() => ({ data: [] })),
  useCreateSubcontractorTeamMutation: vi.fn(() => [vi.fn(), {}]),
  useUpdateSubcontractorTeamMutation: vi.fn(() => [vi.fn(), {}]),
  useDeleteSubcontractorTeamMutation: vi.fn(() => [vi.fn(), {}]),
}));

import {
  useGetSubcontractorsQuery,
  useCreateSubcontractorMutation,
  useUpdateSubcontractorMutation,
  useDeleteSubcontractorMutation,
} from "@/api/endpoints/subcontractors";

const mockSubcontractors = [
  { id: "s1", name: "Smith Builders", companyNumber: "515123456" },
  { id: "s2", name: "Jones Electric", companyNumber: "515123457" },
];

const noopMutation = vi
  .fn()
  .mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });

function renderSubcontractorsPage() {
  return renderWithProviders(<SubcontractorsPage />, {
    preloadedState: { auth: { token: "test-token" } },
  });
}

describe("SubcontractorsPage", () => {
  beforeEach(() => {
    vi.mocked(useGetSubcontractorsQuery).mockReturnValue({
      data: mockSubcontractors,
      isLoading: false,
    } as unknown as ReturnType<typeof useGetSubcontractorsQuery>);
    vi.mocked(useCreateSubcontractorMutation).mockReturnValue([
      noopMutation,
      { isLoading: false },
    ] as unknown as ReturnType<typeof useCreateSubcontractorMutation>);
    vi.mocked(useUpdateSubcontractorMutation).mockReturnValue([
      noopMutation,
      { isLoading: false },
    ] as unknown as ReturnType<typeof useUpdateSubcontractorMutation>);
    vi.mocked(useDeleteSubcontractorMutation).mockReturnValue([
      noopMutation,
      { isLoading: false },
    ] as unknown as ReturnType<typeof useDeleteSubcontractorMutation>);
  });

  it("renders page title", () => {
    renderSubcontractorsPage();
    expect(
      screen.getByRole("heading", { name: "Subcontractors" }),
    ).toBeInTheDocument();
  });

  it("renders subcontractor rows", () => {
    renderSubcontractorsPage();
    expect(screen.getByText("Smith Builders")).toBeInTheDocument();
    expect(screen.getByText("Jones Electric")).toBeInTheDocument();
  });

  it("filters subcontractors by search", async () => {
    renderSubcontractorsPage();
    await userEvent.type(screen.getByRole("searchbox"), "Smith");
    expect(screen.getByText("Smith Builders")).toBeInTheDocument();
    expect(screen.queryByText("Jones Electric")).not.toBeInTheDocument();
  });

  it("filters subcontractors by company number", async () => {
    renderSubcontractorsPage();
    await userEvent.type(screen.getByRole("searchbox"), "515123457");
    expect(screen.getByText("Jones Electric")).toBeInTheDocument();
    expect(screen.queryByText("Smith Builders")).not.toBeInTheDocument();
  });

  it("matches search case-insensitively and ignores surrounding spaces", async () => {
    renderSubcontractorsPage();
    await userEvent.type(screen.getByRole("searchbox"), "  sMiTh  ");
    expect(screen.getByText("Smith Builders")).toBeInTheDocument();
    expect(screen.queryByText("Jones Electric")).not.toBeInTheDocument();
  });

  it("shows no results empty state when search has no matches", async () => {
    renderSubcontractorsPage();
    await userEvent.type(screen.getByRole("searchbox"), "zzz");
    expect(screen.getByText("No results")).toBeInTheDocument();
  });

  it("restores rows when the search box is cleared", async () => {
    renderSubcontractorsPage();
    const box = screen.getByRole("searchbox");
    await userEvent.type(box, "zzz");
    expect(screen.queryByText("Smith Builders")).not.toBeInTheDocument();
    await userEvent.clear(box);
    expect(screen.getByText("Smith Builders")).toBeInTheDocument();
  });

  it("opens add modal when add button clicked", async () => {
    renderSubcontractorsPage();
    await userEvent.click(
      screen.getByRole("button", { name: /add subcontractor/i }),
    );
    expect(screen.getByText("Add Subcontractor")).toBeInTheDocument();
  });

  it("opens edit modal with subcontractor fields prefilled", async () => {
    renderSubcontractorsPage();
    await userEvent.click(screen.getAllByTitle("Edit")[0]);
    expect(screen.getByText("Edit Subcontractor")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Smith Builders")).toBeInTheDocument();
    expect(screen.getByDisplayValue("515123456")).toBeInTheDocument();
  });

  it("shows empty state when no subcontractors", () => {
    vi.mocked(useGetSubcontractorsQuery).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useGetSubcontractorsQuery>);
    renderSubcontractorsPage();
    expect(screen.getByText("No subcontractors yet")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    vi.mocked(useGetSubcontractorsQuery).mockReturnValue({
      data: [],
      isLoading: true,
    } as unknown as ReturnType<typeof useGetSubcontractorsQuery>);
    renderSubcontractorsPage();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });
});
