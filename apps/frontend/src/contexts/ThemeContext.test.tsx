import { describe, it, expect, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "./ThemeContext";
import { useTheme } from "./useTheme";

function ThemeDisplay() {
  const { theme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={() => setTheme("dark")}>Go dark</button>
      <button onClick={() => setTheme("light")}>Go light</button>
    </div>
  );
}

describe("ThemeContext / ThemeProvider", () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("provides default theme of 'light'", () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("theme")).toHaveTextContent("light");
  });

  it("setTheme updates state to 'dark'", async () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );
    await userEvent.click(screen.getByText("Go dark"));
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
  });

  it("sets data-theme attribute to 'dark' on documentElement", async () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );
    await userEvent.click(screen.getByText("Go dark"));
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("removes data-theme attribute when switching back to light", async () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );
    await userEvent.click(screen.getByText("Go dark"));
    await userEvent.click(screen.getByText("Go light"));
    expect(document.documentElement.getAttribute("data-theme")).toBeNull();
  });

  it("persists theme to localStorage", async () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );
    await userEvent.click(screen.getByText("Go dark"));
    expect(localStorage.getItem("beetbite.theme")).toBe("dark");
  });

  it("reads initial theme from localStorage", () => {
    localStorage.setItem("beetbite.theme", "dark");
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
  });
});
