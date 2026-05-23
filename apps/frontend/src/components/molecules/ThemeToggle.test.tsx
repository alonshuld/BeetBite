import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ThemeToggle } from "./ThemeToggle";

function renderThemeToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("renders toggle button with accessible label", () => {
    renderThemeToggle();
    expect(
      screen.getByRole("button", { name: "Toggle theme" }),
    ).toBeInTheDocument();
  });

  it("shows moon emoji when theme is light (default)", () => {
    renderThemeToggle();
    expect(
      screen.getByRole("button", { name: "Toggle theme" }),
    ).toHaveTextContent("🌙");
  });

  it("switches to sun emoji when clicked (dark mode)", async () => {
    renderThemeToggle();
    await userEvent.click(screen.getByRole("button", { name: "Toggle theme" }));
    expect(
      screen.getByRole("button", { name: "Toggle theme" }),
    ).toHaveTextContent("☀️");
  });

  it("toggles back to moon on second click", async () => {
    renderThemeToggle();
    const btn = screen.getByRole("button", { name: "Toggle theme" });
    await userEvent.click(btn);
    await userEvent.click(btn);
    expect(btn).toHaveTextContent("🌙");
  });
});
