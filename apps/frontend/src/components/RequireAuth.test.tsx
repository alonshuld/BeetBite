import { describe, it, expect, beforeEach, afterEach } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { Provider } from "react-redux";
import { makeStore } from "@/test/renderWithProviders";
import RequireAuth from "./RequireAuth";

const TOKEN_KEY = "beetbite.token";

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

function renderRequireAuth(token: string | null, initialPath = "/protected") {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  const store = makeStore({ auth: { token } });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route element={<RequireAuth />}>
            <Route path="/protected" element={<p>Protected content</p>} />
          </Route>
          <Route path="/login" element={<p>Login page</p>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe("RequireAuth", () => {
  it("renders children when token is present", () => {
    renderRequireAuth("valid-token");
    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });

  it("redirects to /login when no token", () => {
    renderRequireAuth(null);
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("does not render protected content when no token", () => {
    renderRequireAuth(null);
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });
});
