import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LangToggle } from "./LangToggle";

describe("LangToggle", () => {
  it("renders EN and HE buttons", () => {
    render(<LangToggle lang="en" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "EN" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "עב" })).toBeInTheDocument();
  });

  it("calls onChange with 'en' when EN clicked", async () => {
    const onChange = vi.fn();
    render(<LangToggle lang="he" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "EN" }));
    expect(onChange).toHaveBeenCalledWith("en");
  });

  it("calls onChange with 'he' when HE clicked", async () => {
    const onChange = vi.fn();
    render(<LangToggle lang="en" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "עב" }));
    expect(onChange).toHaveBeenCalledWith("he");
  });

  it("marks EN as the pressed option when lang is en", () => {
    render(<LangToggle lang="en" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "EN" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("marks HE as the pressed option when lang is he", () => {
    render(<LangToggle lang="he" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "עב" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("leaves the inactive option unpressed", () => {
    render(<LangToggle lang="en" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "עב" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("merges custom className on wrapper", () => {
    const { container } = render(
      <LangToggle lang="en" onChange={vi.fn()} className="custom-class" />,
    );
    expect((container.firstChild as HTMLElement).className).toContain(
      "custom-class",
    );
  });
});
