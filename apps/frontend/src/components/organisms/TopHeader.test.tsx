import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { LangProvider } from "@/contexts/LangContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { TopHeader } from "./TopHeader";

function renderTopHeader(path = "/projects") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LangProvider>
        <ThemeProvider>
          <TopHeader
            onMenuClick={vi.fn()}
            month="2025-03"
            onMonthChange={vi.fn()}
          />
        </ThemeProvider>
      </LangProvider>
    </MemoryRouter>,
  );
}

describe("TopHeader", () => {
  it("renders page title for /projects route", () => {
    renderTopHeader("/projects");
    expect(screen.getByText("Projects")).toBeInTheDocument();
  });

  it("renders page title for /clients route", () => {
    renderTopHeader("/clients");
    expect(screen.getByText("Clients")).toBeInTheDocument();
  });

  it("renders page title for /suppliers route", () => {
    renderTopHeader("/suppliers");
    expect(screen.getByText("Manpower / Suppliers")).toBeInTheDocument();
  });

  it("shows month picker on /income route", () => {
    renderTopHeader("/income");
    expect(
      screen.getByRole("button", { name: /March 2025/ }),
    ).toBeInTheDocument();
  });

  it("shows month picker on /reports route", () => {
    renderTopHeader("/reports");
    expect(
      screen.getByRole("button", { name: /March 2025/ }),
    ).toBeInTheDocument();
  });

  it("shows month picker on /supplier-payments route", () => {
    renderTopHeader("/supplier-payments");
    expect(
      screen.getByRole("button", { name: /March 2025/ }),
    ).toBeInTheDocument();
  });

  it("hides month picker on /projects route", () => {
    renderTopHeader("/projects");
    expect(
      screen.queryByRole("button", { name: /March/ }),
    ).not.toBeInTheDocument();
  });

  it("renders theme toggle button", () => {
    renderTopHeader();
    expect(
      screen.getByRole("button", { name: "Toggle theme" }),
    ).toBeInTheDocument();
  });

  it("renders EN and HE lang toggle buttons", () => {
    renderTopHeader();
    expect(screen.getByRole("button", { name: "EN" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "עב" })).toBeInTheDocument();
  });

  it("renders menu button for mobile", () => {
    renderTopHeader();
    expect(
      screen.getByRole("button", { name: "Open menu" }),
    ).toBeInTheDocument();
  });

  it("calls onMenuClick when menu button clicked", async () => {
    const onMenuClick = vi.fn();
    render(
      <MemoryRouter initialEntries={["/projects"]}>
        <LangProvider>
          <ThemeProvider>
            <TopHeader
              onMenuClick={onMenuClick}
              month="2025-03"
              onMonthChange={vi.fn()}
            />
          </ThemeProvider>
        </LangProvider>
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(onMenuClick).toHaveBeenCalledOnce();
  });
});
