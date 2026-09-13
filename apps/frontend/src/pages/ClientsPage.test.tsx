import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/renderWithProviders";
import ClientsPage from "./ClientsPage";

vi.mock("@/api/endpoints/clients", () => ({
  useGetClientsQuery: vi.fn(),
  useCreateClientMutation: vi.fn(),
  useUpdateClientMutation: vi.fn(),
  useDeleteClientMutation: vi.fn(),
}));

import {
  useGetClientsQuery,
  useCreateClientMutation,
  useUpdateClientMutation,
  useDeleteClientMutation,
} from "@/api/endpoints/clients";

const mockClients = [
  { id: "c1", name: "Acme Corp" },
  { id: "c2", name: "Beta LLC" },
];

const noopMutation = vi
  .fn()
  .mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });

function renderClientsPage() {
  return renderWithProviders(<ClientsPage />, {
    preloadedState: { auth: { token: "test-token" } },
  });
}

describe("ClientsPage", () => {
  beforeEach(() => {
    vi.mocked(useGetClientsQuery).mockReturnValue({
      data: mockClients,
      isLoading: false,
    } as unknown as ReturnType<typeof useGetClientsQuery>);
    vi.mocked(useCreateClientMutation).mockReturnValue([
      noopMutation,
      { isLoading: false },
    ] as unknown as ReturnType<typeof useCreateClientMutation>);
    vi.mocked(useUpdateClientMutation).mockReturnValue([
      noopMutation,
      { isLoading: false },
    ] as unknown as ReturnType<typeof useUpdateClientMutation>);
    vi.mocked(useDeleteClientMutation).mockReturnValue([
      noopMutation,
      { isLoading: false },
    ] as unknown as ReturnType<typeof useDeleteClientMutation>);
  });

  it("renders page title", () => {
    renderClientsPage();
    expect(
      screen.getByRole("heading", { name: "Clients" }),
    ).toBeInTheDocument();
  });

  it("renders client rows in table", () => {
    renderClientsPage();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("Beta LLC")).toBeInTheDocument();
  });

  it("filters clients by search input", async () => {
    renderClientsPage();
    await userEvent.type(screen.getByRole("searchbox"), "Acme");
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.queryByText("Beta LLC")).not.toBeInTheDocument();
  });

  it("shows no results empty state when search has no matches", async () => {
    renderClientsPage();
    await userEvent.type(screen.getByRole("searchbox"), "zzz");
    expect(screen.getByText("No results")).toBeInTheDocument();
  });

  it("matches search case-insensitively and ignores surrounding spaces", async () => {
    renderClientsPage();
    await userEvent.type(screen.getByRole("searchbox"), "  aCmE  ");
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.queryByText("Beta LLC")).not.toBeInTheDocument();
  });

  it("restores rows when the search box is cleared", async () => {
    renderClientsPage();
    const box = screen.getByRole("searchbox");
    await userEvent.type(box, "zzz");
    expect(screen.queryByText("Acme Corp")).not.toBeInTheDocument();
    await userEvent.clear(box);
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("opens add modal when add button clicked", async () => {
    renderClientsPage();
    await userEvent.click(screen.getByRole("button", { name: /add client/i }));
    expect(screen.getByText("Add Client")).toBeInTheDocument();
  });

  it("opens edit modal with client name prefilled", async () => {
    renderClientsPage();
    await userEvent.click(screen.getAllByTitle("Edit")[0]);
    expect(screen.getByText("Edit Client")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Acme Corp")).toBeInTheDocument();
  });

  it("opens delete confirm modal when delete button clicked", async () => {
    renderClientsPage();
    await userEvent.click(screen.getAllByTitle("Delete")[0]);
    expect(screen.getByText(/permanently delete/i)).toBeInTheDocument();
  });

  it("warns that deleting a client cascades to related records", async () => {
    renderClientsPage();
    await userEvent.click(screen.getAllByTitle("Delete")[0]);
    expect(
      screen.getByText(/related projects, reports, and payments/i),
    ).toBeInTheDocument();
  });

  it("shows loading state", () => {
    vi.mocked(useGetClientsQuery).mockReturnValue({
      data: [],
      isLoading: true,
    } as unknown as ReturnType<typeof useGetClientsQuery>);
    renderClientsPage();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows empty state when no clients", () => {
    vi.mocked(useGetClientsQuery).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useGetClientsQuery>);
    renderClientsPage();
    expect(screen.getByText("No clients yet")).toBeInTheDocument();
  });
});
