import { describe, it, expect, vi, afterEach } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { LangProvider } from "@/contexts/LangContext";
import { makeStore } from "@/test/renderWithProviders";
import { Sidebar } from "./Sidebar";

function renderSidebar(
  opts: { open?: boolean; onClose?: () => void; token?: string } = {},
) {
  const { open = true, onClose = vi.fn(), token = "header.payload.sig" } = opts;
  const store = makeStore({ auth: { token } });
  return {
    store,
    ...render(
      <Provider store={store}>
        <MemoryRouter initialEntries={["/projects"]}>
          <LangProvider>
            <Sidebar open={open} onClose={onClose} />
          </LangProvider>
        </MemoryRouter>
      </Provider>,
    ),
  };
}

describe("Sidebar", () => {
  it("renders BeetBite logo text", () => {
    renderSidebar();
    expect(screen.getByText("BeetBite")).toBeInTheDocument();
  });

  it("renders navigation links", () => {
    renderSidebar();
    expect(screen.getByText("Projects")).toBeInTheDocument();
    expect(screen.getByText("Clients")).toBeInTheDocument();
  });

  it("renders all nav sections", () => {
    renderSidebar();
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Management")).toBeInTheDocument();
    // "Tools" section was removed from the sidebar; only Overview and Management remain
    expect(screen.queryByText("Tools")).not.toBeInTheDocument();
  });

  it("renders sign out button", () => {
    renderSidebar();
    expect(
      screen.getByRole("button", { name: "Sign out" }),
    ).toBeInTheDocument();
  });

  it("shows mobile overlay when open", () => {
    const { container } = renderSidebar({ open: true });
    expect(container.querySelector(".bg-black\\/50")).toBeInTheDocument();
  });

  it("hides mobile overlay when closed", () => {
    const { container } = renderSidebar({ open: false });
    expect(container.querySelector(".bg-black\\/50")).not.toBeInTheDocument();
  });

  it("calls onClose when overlay clicked", async () => {
    const onClose = vi.fn();
    const { container } = renderSidebar({ onClose });
    const overlay = container.querySelector(".bg-black\\/50");
    if (overlay) await userEvent.click(overlay);
    expect(onClose).toHaveBeenCalled();
  });

  it("dispatches logout when sign out clicked", async () => {
    const { store } = renderSidebar();
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(store.getState().auth.token).toBeNull();
  });

  it("shows username from token username claim", () => {
    const payload = btoa(
      JSON.stringify({ sub: "user-id", username: "testuser" }),
    );
    const token = `header.${payload}.sig`;
    renderSidebar({ token });
    expect(screen.getByText("testuser")).toBeInTheDocument();
  });

  it("falls back to Admin when token is invalid", () => {
    renderSidebar({ token: "invalid-token" });
    expect(screen.getAllByText("Admin").length).toBeGreaterThanOrEqual(1);
  });

  describe("in Hebrew", () => {
    afterEach(() => localStorage.removeItem("beetbite.lang"));

    it("names the monthly income tab ריכוז מחזורי", () => {
      localStorage.setItem("beetbite.lang", "he");
      renderSidebar();
      expect(
        screen.getByRole("link", { name: /ריכוז מחזורי/ }),
      ).toHaveAttribute("href", "/income");
      expect(screen.queryByText("הכנסה חודשית")).toBeNull();
    });
  });
});
