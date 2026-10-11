import { describe, it, expect } from "vite-plus/test";
import { render } from "@testing-library/react";
import { Divider } from "./Divider";

describe("Divider", () => {
  it("renders an hr element", () => {
    const { container } = render(<Divider />);
    expect(container.querySelector("hr")).toBeInTheDocument();
  });

  it("merges custom className", () => {
    const { container } = render(<Divider className="my-custom" />);
    expect(container.querySelector("hr")!.className).toContain("my-custom");
  });

  it("passes through HTML attributes", () => {
    const { container } = render(<Divider aria-hidden="true" />);
    expect(container.querySelector("hr")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("includes default border-none class", () => {
    const { container } = render(<Divider />);
    expect(container.querySelector("hr")!.className).toContain("border-none");
  });
});
