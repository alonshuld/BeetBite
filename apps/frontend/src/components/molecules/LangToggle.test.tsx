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

  it("EN button has active style when lang is en", () => {
    render(<LangToggle lang="en" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "EN" }).className).toContain(
      "bg-beet",
    );
  });

  it("HE button has active style when lang is he", () => {
    render(<LangToggle lang="he" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "עב" }).className).toContain(
      "bg-beet",
    );
  });

  it("inactive button does not have bg-beet class", () => {
    render(<LangToggle lang="en" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "עב" }).className).not.toContain(
      "bg-beet",
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
