import { describe, it, expect, vi } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { Select } from "./Select";

describe("Select", () => {
  it("renders without label", () => {
    render(
      <Select>
        <option value="a">Option A</option>
      </Select>,
    );
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("renders with label", () => {
    render(
      <Select id="test" label="Choose one">
        <option value="a">Option A</option>
      </Select>,
    );
    expect(screen.getByLabelText("Choose one")).toBeInTheDocument();
  });

  it("renders children as options", () => {
    render(
      <Select>
        <option value="a">Option A</option>
        <option value="b">Option B</option>
      </Select>,
    );
    expect(screen.getByText("Option A")).toBeInTheDocument();
    expect(screen.getByText("Option B")).toBeInTheDocument();
  });

  it("fires onChange when selection changes", async () => {
    const onChange = vi.fn();
    render(
      <Select onChange={onChange}>
        <option value="a">Option A</option>
        <option value="b">Option B</option>
      </Select>,
    );
    await userEvent.selectOptions(screen.getByRole("combobox"), "b");
    expect(onChange).toHaveBeenCalled();
  });

  it("is disabled when disabled prop set", () => {
    render(
      <Select disabled>
        <option value="a">A</option>
      </Select>,
    );
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("merges custom className", () => {
    render(
      <Select className="custom-class">
        <option value="a">A</option>
      </Select>,
    );
    expect(screen.getByRole("combobox").className).toContain("custom-class");
  });

  it("forwards ref to select element", () => {
    const ref = createRef<HTMLSelectElement>();
    render(
      <Select ref={ref}>
        <option value="a">A</option>
      </Select>,
    );
    expect(ref.current).toBeInstanceOf(HTMLSelectElement);
  });
});
