import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toggle } from "./Toggle";

describe("Toggle", () => {
  it("renders checkbox input", () => {
    render(<Toggle id="t1" />);
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
  });

  it("renders label text when provided", () => {
    render(<Toggle id="t1" label="Enable feature" />);
    expect(screen.getByText("Enable feature")).toBeInTheDocument();
  });

  it("does not render label text when label prop omitted", () => {
    render(<Toggle id="t1" />);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("is unchecked by default", () => {
    render(<Toggle id="t1" />);
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("reflects checked state", () => {
    render(<Toggle id="t1" checked onChange={() => {}} />);
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("calls onChange when toggled", async () => {
    const onChange = vi.fn();
    render(<Toggle id="t1" onChange={onChange} />);
    await userEvent.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("is disabled when disabled prop set", () => {
    render(<Toggle id="t1" disabled />);
    expect(screen.getByRole("checkbox")).toBeDisabled();
  });
});
