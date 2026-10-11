import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/renderWithProviders";
import InitiatorsPage from "./InitiatorsPage";

vi.mock("@/api/endpoints/initiators", () => ({
  useGetInitiatorsQuery: vi.fn(),
  useCreateInitiatorMutation: vi.fn(),
  useUpdateInitiatorMutation: vi.fn(),
  useDeleteInitiatorMutation: vi.fn(),
}));

import {
  useGetInitiatorsQuery,
  useCreateInitiatorMutation,
  useUpdateInitiatorMutation,
  useDeleteInitiatorMutation,
} from "@/api/endpoints/initiators";

const mockInitiators = [
  { id: "init1", name: "Yaniv Goldman" },
  { id: "init2", name: "Dana Levi" },
];

const noopMutation = vi
  .fn()
  .mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });

function renderInitiatorsPage() {
  return renderWithProviders(<InitiatorsPage />, {
    preloadedState: { auth: { token: "test-token" } },
  });
}

describe("InitiatorsPage", () => {
  beforeEach(() => {
    vi.mocked(useGetInitiatorsQuery).mockReturnValue({
      data: mockInitiators,
      isLoading: false,
    } as unknown as ReturnType<typeof useGetInitiatorsQuery>);
    vi.mocked(useCreateInitiatorMutation).mockReturnValue([
      noopMutation,
      { isLoading: false },
    ] as unknown as ReturnType<typeof useCreateInitiatorMutation>);
    vi.mocked(useUpdateInitiatorMutation).mockReturnValue([
      noopMutation,
      { isLoading: false },
    ] as unknown as ReturnType<typeof useUpdateInitiatorMutation>);
    vi.mocked(useDeleteInitiatorMutation).mockReturnValue([
      noopMutation,
      { isLoading: false },
    ] as unknown as ReturnType<typeof useDeleteInitiatorMutation>);
  });

  it("renders page title", () => {
    renderInitiatorsPage();
    expect(
      screen.getByRole("heading", { name: "Initiators" }),
    ).toBeInTheDocument();
  });

  it("renders initiator rows", () => {
    renderInitiatorsPage();
    expect(screen.getByText("Yaniv Goldman")).toBeInTheDocument();
    expect(screen.getByText("Dana Levi")).toBeInTheDocument();
  });

  it("filters initiators by search", async () => {
    renderInitiatorsPage();
    await userEvent.type(screen.getByRole("searchbox"), "Yaniv");
    expect(screen.getByText("Yaniv Goldman")).toBeInTheDocument();
    expect(screen.queryByText("Dana Levi")).not.toBeInTheDocument();
  });

  it("shows no results empty state when search has no matches", async () => {
    renderInitiatorsPage();
    await userEvent.type(screen.getByRole("searchbox"), "zzz");
    expect(screen.getByText("No results")).toBeInTheDocument();
  });

  it("opens add modal when add button clicked", async () => {
    renderInitiatorsPage();
    await userEvent.click(
      screen.getByRole("button", { name: /add initiator/i }),
    );
    expect(screen.getByText("Add Initiator")).toBeInTheDocument();
  });

  it("opens edit modal with initiator name prefilled", async () => {
    renderInitiatorsPage();
    await userEvent.click(screen.getAllByTitle("Edit")[0]);
    expect(screen.getByText("Edit Initiator")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Yaniv Goldman")).toBeInTheDocument();
  });

  it("shows empty state when no initiators", () => {
    vi.mocked(useGetInitiatorsQuery).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useGetInitiatorsQuery>);
    renderInitiatorsPage();
    expect(screen.getByText("No initiators yet")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    vi.mocked(useGetInitiatorsQuery).mockReturnValue({
      data: [],
      isLoading: true,
    } as unknown as ReturnType<typeof useGetInitiatorsQuery>);
    renderInitiatorsPage();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });
});
