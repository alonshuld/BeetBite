import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/renderWithProviders";
import SuppliersPage from "./SuppliersPage";

vi.mock("@/api/endpoints/suppliers", () => ({
  useGetSuppliersQuery: vi.fn(),
  useCreateSupplierMutation: vi.fn(),
  useUpdateSupplierMutation: vi.fn(),
  useDeleteSupplierMutation: vi.fn(),
}));

import {
  useGetSuppliersQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
} from "@/api/endpoints/suppliers";

const mockSuppliers = [
  { id: "corp1", name: "Global Inc" },
  { id: "corp2", name: "Local Ltd" },
];

const noopMutation = vi
  .fn()
  .mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });

function renderSuppliersPage() {
  return renderWithProviders(<SuppliersPage />, {
    preloadedState: { auth: { token: "test-token" } },
  });
}

describe("SuppliersPage", () => {
  beforeEach(() => {
    vi.mocked(useGetSuppliersQuery).mockReturnValue({
      data: mockSuppliers,
      isLoading: false,
    } as unknown as ReturnType<typeof useGetSuppliersQuery>);
    vi.mocked(useCreateSupplierMutation).mockReturnValue([
      noopMutation,
      { isLoading: false },
    ] as unknown as ReturnType<typeof useCreateSupplierMutation>);
    vi.mocked(useUpdateSupplierMutation).mockReturnValue([
      noopMutation,
      { isLoading: false },
    ] as unknown as ReturnType<typeof useUpdateSupplierMutation>);
    vi.mocked(useDeleteSupplierMutation).mockReturnValue([
      noopMutation,
      { isLoading: false },
    ] as unknown as ReturnType<typeof useDeleteSupplierMutation>);
  });

  it("renders page title", () => {
    renderSuppliersPage();
    expect(
      screen.getByRole("heading", { name: "Manpower / Suppliers" }),
    ).toBeInTheDocument();
  });

  it("renders supplier rows", () => {
    renderSuppliersPage();
    expect(screen.getByText("Global Inc")).toBeInTheDocument();
    expect(screen.getByText("Local Ltd")).toBeInTheDocument();
  });

  it("filters suppliers by search", async () => {
    renderSuppliersPage();
    await userEvent.type(screen.getByRole("searchbox"), "Global");
    expect(screen.getByText("Global Inc")).toBeInTheDocument();
    expect(screen.queryByText("Local Ltd")).not.toBeInTheDocument();
  });

  it("matches search case-insensitively and ignores surrounding spaces", async () => {
    renderSuppliersPage();
    await userEvent.type(screen.getByRole("searchbox"), "  gLoBaL  ");
    expect(screen.getByText("Global Inc")).toBeInTheDocument();
    expect(screen.queryByText("Local Ltd")).not.toBeInTheDocument();
  });

  it("shows no results empty state when search has no matches", async () => {
    renderSuppliersPage();
    await userEvent.type(screen.getByRole("searchbox"), "zzz");
    expect(screen.getByText("No results")).toBeInTheDocument();
  });

  it("restores rows when the search box is cleared", async () => {
    renderSuppliersPage();
    const box = screen.getByRole("searchbox");
    await userEvent.type(box, "zzz");
    expect(screen.queryByText("Global Inc")).not.toBeInTheDocument();
    await userEvent.clear(box);
    expect(screen.getByText("Global Inc")).toBeInTheDocument();
  });

  it("opens add modal when add button clicked", async () => {
    renderSuppliersPage();
    await userEvent.click(
      screen.getByRole("button", { name: /add manpower \/ supplier/i }),
    );
    expect(screen.getByText("Add Manpower / Supplier")).toBeInTheDocument();
  });

  it("opens edit modal with supplier name prefilled", async () => {
    renderSuppliersPage();
    await userEvent.click(screen.getAllByTitle("Edit")[0]);
    expect(screen.getByText("Edit Manpower / Supplier")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Global Inc")).toBeInTheDocument();
  });

  it("shows empty state when no suppliers", () => {
    vi.mocked(useGetSuppliersQuery).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useGetSuppliersQuery>);
    renderSuppliersPage();
    expect(
      screen.getByText("No manpower or suppliers yet"),
    ).toBeInTheDocument();
  });

  it("shows loading state", () => {
    vi.mocked(useGetSuppliersQuery).mockReturnValue({
      data: [],
      isLoading: true,
    } as unknown as ReturnType<typeof useGetSuppliersQuery>);
    renderSuppliersPage();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });
});
