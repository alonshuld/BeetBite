import { describe, it, expect, vi } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchInput } from "./SearchInput";

describe("SearchInput", () => {
  it("renders search input", () => {
    render(<SearchInput />);
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
  });

  it("accepts typed input", async () => {
    render(<SearchInput placeholder="Search..." />);
    const input = screen.getByRole("searchbox");
    await userEvent.type(input, "test");
    expect(input).toHaveValue("test");
  });

  it("calls onChange handler", async () => {
    const onChange = vi.fn();
    render(<SearchInput onChange={onChange} />);
    await userEvent.type(screen.getByRole("searchbox"), "a");
    expect(onChange).toHaveBeenCalled();
  });

  it("forwards ref", () => {
    const ref = {
      current: null,
    } as unknown as React.RefObject<HTMLInputElement>;
    render(<SearchInput ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it("passes placeholder", () => {
    render(<SearchInput placeholder="Search clients..." />);
    expect(
      screen.getByPlaceholderText("Search clients..."),
    ).toBeInTheDocument();
  });

  it("merges custom className on wrapper", () => {
    const { container } = render(<SearchInput className="w-64" />);
    expect(container.firstChild).toHaveClass("w-64");
  });

  // Full width on a phone, a fixed width from the small breakpoint up, so no
  // page has to size it (and none leaves a gap beside it on a phone).
  it("spans the full width on a phone and fixes it on wider screens", () => {
    render(<SearchInput />);
    const wrapper = screen.getByRole("searchbox").parentElement;
    expect(wrapper).toHaveClass("w-full", "sm:w-80");
    expect(wrapper).not.toHaveClass("w-80");
  });
});
