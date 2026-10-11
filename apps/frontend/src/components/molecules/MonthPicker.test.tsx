import { describe, it, expect, vi } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LangProvider } from "@/contexts/LangContext";
import { MonthPicker } from "./MonthPicker";

function renderMonthPicker(props: {
  value: string;
  onChange: (ym: string) => void;
}) {
  return render(
    <LangProvider>
      <MonthPicker {...props} />
    </LangProvider>,
  );
}

describe("MonthPicker", () => {
  it("displays current month and year as button label", () => {
    renderMonthPicker({ value: "2025-03", onChange: vi.fn() });
    expect(
      screen.getByRole("button", { name: /March 2025/ }),
    ).toBeInTheDocument();
  });

  it("popover is closed by default", () => {
    renderMonthPicker({ value: "2025-03", onChange: vi.fn() });
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("opens popover when button clicked", async () => {
    renderMonthPicker({ value: "2025-03", onChange: vi.fn() });
    await userEvent.click(screen.getByRole("button", { name: /March 2025/ }));
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("shows year select when popover open", async () => {
    renderMonthPicker({ value: "2025-03", onChange: vi.fn() });
    await userEvent.click(screen.getByRole("button", { name: /March 2025/ }));
    const yearSelect = screen.getByRole("combobox");
    expect(yearSelect).toHaveValue("2025");
  });

  it("shows 12 month buttons when popover open", async () => {
    renderMonthPicker({ value: "2025-03", onChange: vi.fn() });
    await userEvent.click(screen.getByRole("button", { name: /March 2025/ }));
    expect(screen.getByRole("button", { name: "Jan" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dec" })).toBeInTheDocument();
  });

  it("fires onChange with correct YYYY-MM when month clicked", async () => {
    const onChange = vi.fn();
    renderMonthPicker({ value: "2025-03", onChange });
    await userEvent.click(screen.getByRole("button", { name: /March 2025/ }));
    await userEvent.click(screen.getByRole("button", { name: "Jun" }));
    expect(onChange).toHaveBeenCalledWith("2025-06");
  });

  it("closes popover after month selected", async () => {
    renderMonthPicker({ value: "2025-03", onChange: vi.fn() });
    await userEvent.click(screen.getByRole("button", { name: /March 2025/ }));
    await userEvent.click(screen.getByRole("button", { name: "Jun" }));
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("closes popover on outside click", async () => {
    renderMonthPicker({ value: "2025-03", onChange: vi.fn() });
    await userEvent.click(screen.getByRole("button", { name: /March 2025/ }));
    await userEvent.click(document.body);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("fires onChange with new year when year select changed", async () => {
    const onChange = vi.fn();
    renderMonthPicker({ value: "2025-03", onChange });
    await userEvent.click(screen.getByRole("button", { name: /March 2025/ }));
    await userEvent.selectOptions(screen.getByRole("combobox"), "2026");
    expect(onChange).toHaveBeenCalledWith("2026-03");
  });
});
