import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/renderWithProviders";
import CorporationsPage from "./CorporationsPage";

vi.mock("@/api/endpoints/corporations", () => ({
  useGetCorporationsQuery: vi.fn(),
  useCreateCorporationMutation: vi.fn(),
  useUpdateCorporationMutation: vi.fn(),
  useDeleteCorporationMutation: vi.fn(),
}));

import {
  useGetCorporationsQuery,
  useCreateCorporationMutation,
  useUpdateCorporationMutation,
  useDeleteCorporationMutation,
} from "@/api/endpoints/corporations";

const mockCorporations = [
  { id: "corp1", name: "Global Inc" },
  { id: "corp2", name: "Local Ltd" },
];

const noopMutation = vi
  .fn()
  .mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });

function renderCorporationsPage() {
  return renderWithProviders(<CorporationsPage />, {
    preloadedState: { auth: { token: "test-token" } },
  });
}

describe("CorporationsPage", () => {
  beforeEach(() => {
    vi.mocked(useGetCorporationsQuery).mockReturnValue({
      data: mockCorporations,
      isLoading: false,
    } as unknown as ReturnType<typeof useGetCorporationsQuery>);
    vi.mocked(useCreateCorporationMutation).mockReturnValue([
      noopMutation,
      { isLoading: false },
    ] as unknown as ReturnType<typeof useCreateCorporationMutation>);
    vi.mocked(useUpdateCorporationMutation).mockReturnValue([
      noopMutation,
      { isLoading: false },
    ] as unknown as ReturnType<typeof useUpdateCorporationMutation>);
    vi.mocked(useDeleteCorporationMutation).mockReturnValue([
      noopMutation,
      { isLoading: false },
    ] as unknown as ReturnType<typeof useDeleteCorporationMutation>);
  });

  it("renders page title", () => {
    renderCorporationsPage();
    expect(
      screen.getByRole("heading", { name: "Corporations" }),
    ).toBeInTheDocument();
  });

  it("renders corporation rows", () => {
    renderCorporationsPage();
    expect(screen.getByText("Global Inc")).toBeInTheDocument();
    expect(screen.getByText("Local Ltd")).toBeInTheDocument();
  });

  it("filters corporations by search", async () => {
    renderCorporationsPage();
    await userEvent.type(screen.getByRole("searchbox"), "Global");
    expect(screen.getByText("Global Inc")).toBeInTheDocument();
    expect(screen.queryByText("Local Ltd")).not.toBeInTheDocument();
  });

  it("matches search case-insensitively and ignores surrounding spaces", async () => {
    renderCorporationsPage();
    await userEvent.type(screen.getByRole("searchbox"), "  gLoBaL  ");
    expect(screen.getByText("Global Inc")).toBeInTheDocument();
    expect(screen.queryByText("Local Ltd")).not.toBeInTheDocument();
  });

  it("shows no results empty state when search has no matches", async () => {
    renderCorporationsPage();
    await userEvent.type(screen.getByRole("searchbox"), "zzz");
    expect(screen.getByText("No results")).toBeInTheDocument();
  });

  it("restores rows when the search box is cleared", async () => {
    renderCorporationsPage();
    const box = screen.getByRole("searchbox");
    await userEvent.type(box, "zzz");
    expect(screen.queryByText("Global Inc")).not.toBeInTheDocument();
    await userEvent.clear(box);
    expect(screen.getByText("Global Inc")).toBeInTheDocument();
  });

  it("opens add modal when add button clicked", async () => {
    renderCorporationsPage();
    await userEvent.click(
      screen.getByRole("button", { name: /add corporation/i }),
    );
    expect(screen.getByText("Add Corporation")).toBeInTheDocument();
  });

  it("opens edit modal with corporation name prefilled", async () => {
    renderCorporationsPage();
    await userEvent.click(screen.getAllByTitle("Edit")[0]);
    expect(screen.getByText("Edit Corporation")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Global Inc")).toBeInTheDocument();
  });

  it("shows empty state when no corporations", () => {
    vi.mocked(useGetCorporationsQuery).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useGetCorporationsQuery>);
    renderCorporationsPage();
    expect(screen.getByText("No corporations yet")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    vi.mocked(useGetCorporationsQuery).mockReturnValue({
      data: [],
      isLoading: true,
    } as unknown as ReturnType<typeof useGetCorporationsQuery>);
    renderCorporationsPage();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });
});
