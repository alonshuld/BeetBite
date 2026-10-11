import { describe, it, expect } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import { FormGroup, FormRow } from "./FormGroup";

describe("FormGroup", () => {
  it("renders children", () => {
    render(
      <FormGroup>
        <span>content</span>
      </FormGroup>,
    );
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("includes mb-4 spacing class", () => {
    const { container } = render(<FormGroup />);
    expect((container.firstChild as HTMLElement).className).toContain("mb-4");
  });

  it("merges custom className", () => {
    const { container } = render(<FormGroup className="custom-class" />);
    expect((container.firstChild as HTMLElement).className).toContain(
      "custom-class",
    );
  });
});

describe("FormRow", () => {
  it("renders children", () => {
    render(
      <FormRow>
        <div>col1</div>
        <div>col2</div>
      </FormRow>,
    );
    expect(screen.getByText("col1")).toBeInTheDocument();
    expect(screen.getByText("col2")).toBeInTheDocument();
  });

  it("includes grid layout class", () => {
    const { container } = render(<FormRow />);
    expect((container.firstChild as HTMLElement).className).toContain("grid");
  });

  it("merges custom className", () => {
    const { container } = render(<FormRow className="custom-class" />);
    expect((container.firstChild as HTMLElement).className).toContain(
      "custom-class",
    );
  });
});
