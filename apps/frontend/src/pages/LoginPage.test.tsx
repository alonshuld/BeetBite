import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/renderWithProviders";
import LoginPage from "./LoginPage";

vi.mock("@/api/endpoints/auth", () => ({
  useLoginMutation: vi.fn(),
}));

import { useLoginMutation } from "@/api/endpoints/auth";

function renderLoginPage() {
  return renderWithProviders(<LoginPage />);
}

describe("LoginPage", () => {
  const mockLoginFn = vi.fn();

  beforeEach(() => {
    mockLoginFn.mockReset();
    vi.mocked(useLoginMutation).mockReturnValue([
      mockLoginFn,
      { isLoading: false },
    ] as unknown as ReturnType<typeof useLoginMutation>);
  });

  it("renders username and password inputs", () => {
    renderLoginPage();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("renders sign in button", () => {
    renderLoginPage();
    expect(
      screen.getByRole("button", { name: /sign in/i }),
    ).toBeInTheDocument();
  });

  it("shows error when username and password are empty on submit", async () => {
    renderLoginPage();
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(screen.getByText("Please fill in all fields")).toBeInTheDocument();
  });

  it("calls login with credentials when form submitted", async () => {
    mockLoginFn.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ accessToken: "token123" }),
    });
    renderLoginPage();
    await userEvent.type(screen.getByLabelText(/username/i), "admin");
    await userEvent.type(screen.getByLabelText(/password/i), "pass123");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(mockLoginFn).toHaveBeenCalledWith({
      username: "admin",
      password: "pass123",
    });
  });

  it("shows loading state when login in progress", () => {
    vi.mocked(useLoginMutation).mockReturnValue([
      mockLoginFn,
      { isLoading: true },
    ] as unknown as ReturnType<typeof useLoginMutation>);
    renderLoginPage();
    expect(screen.getByRole("button", { name: /signing in/i })).toBeDisabled();
  });

  it("shows error message on failed login", async () => {
    mockLoginFn.mockReturnValue({
      unwrap: vi
        .fn()
        .mockRejectedValue({ data: { message: "Invalid credentials" } }),
    });
    renderLoginPage();
    await userEvent.type(screen.getByLabelText(/username/i), "admin");
    await userEvent.type(screen.getByLabelText(/password/i), "wrong");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(await screen.findByText("Invalid credentials")).toBeInTheDocument();
  });

  it("shows generic error on unknown failure", async () => {
    mockLoginFn.mockReturnValue({
      unwrap: vi.fn().mockRejectedValue(new Error("network")),
    });
    renderLoginPage();
    await userEvent.type(screen.getByLabelText(/username/i), "admin");
    await userEvent.type(screen.getByLabelText(/password/i), "pass");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(await screen.findByText("Login failed")).toBeInTheDocument();
  });

  it("offers the theme toggle before signing in", async () => {
    renderLoginPage();
    await userEvent.click(screen.getByRole("button", { name: "Toggle theme" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    localStorage.removeItem("beetbite.theme");
    document.documentElement.removeAttribute("data-theme");
  });

  it("shows a coded login error in Hebrew", async () => {
    localStorage.setItem("beetbite.lang", "he");
    mockLoginFn.mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({
        status: 401,
        data: { message: "Invalid credentials", code: "INVALID_CREDENTIALS" },
      }),
    });
    renderLoginPage();
    await userEvent.type(screen.getByLabelText("שם משתמש"), "admin");
    await userEvent.type(screen.getByLabelText("סיסמה"), "wrong");
    await userEvent.click(screen.getByRole("button", { name: "כניסה" }));
    expect(
      await screen.findByText("שם משתמש או סיסמה שגויים."),
    ).toBeInTheDocument();
    localStorage.removeItem("beetbite.lang");
  });
});
