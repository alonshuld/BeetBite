import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "./Input";

describe("Input", () => {
  it("renders input element", () => {
    render(<Input />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("renders label when provided", () => {
    render(<Input label="Email" id="email" />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
  });

  it("does not render label element when label prop omitted", () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.queryByRole("label")).not.toBeInTheDocument();
  });

  it("associates label with input via id", () => {
    render(<Input label="Name" id="name-input" />);
    const input = screen.getByLabelText("Name");
    expect(input.id).toBe("name-input");
  });

  it("accepts typed input", async () => {
    render(<Input placeholder="Type here" />);
    const input = screen.getByRole("textbox");
    await userEvent.type(input, "hello");
    expect(input).toHaveValue("hello");
  });

  it("forwards ref", () => {
    const ref = {
      current: null,
    } as unknown as React.RefObject<HTMLInputElement>;
    render(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it("is disabled when disabled prop set", () => {
    render(<Input disabled />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it("merges custom className", () => {
    render(<Input className="extra-class" />);
    expect(screen.getByRole("textbox").className).toContain("extra-class");
  });

  it("passes through placeholder", () => {
    render(<Input placeholder="Search..." />);
    expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
  });
});
