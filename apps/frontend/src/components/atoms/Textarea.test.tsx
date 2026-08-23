import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { Textarea } from "./Textarea";

describe("Textarea", () => {
  it("renders without label", () => {
    render(<Textarea />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("renders with label linked via id", () => {
    render(<Textarea id="notes" label="Notes" />);
    expect(screen.getByLabelText("Notes")).toBeInTheDocument();
  });

  it("accepts typed input", async () => {
    render(<Textarea />);
    await userEvent.type(screen.getByRole("textbox"), "Hello world");
    expect(screen.getByRole("textbox")).toHaveValue("Hello world");
  });

  it("is disabled when disabled prop set", () => {
    render(<Textarea disabled />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it("merges custom className", () => {
    render(<Textarea className="custom-class" />);
    expect(screen.getByRole("textbox").className).toContain("custom-class");
  });

  it("renders placeholder text", () => {
    render(<Textarea placeholder="Enter notes here" />);
    expect(screen.getByPlaceholderText("Enter notes here")).toBeInTheDocument();
  });

  it("forwards ref to textarea element", () => {
    const ref = createRef<HTMLTextAreaElement>();
    render(<Textarea ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });
});
