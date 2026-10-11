import { describe, it, expect } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("renders children", () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("applies muted variant by default", () => {
    render(<Badge>Default</Badge>);
    const badge = screen.getByText("Default");
    expect(badge.className).toContain("bg-surface-3");
  });

  it("applies green variant classes", () => {
    render(<Badge variant="green">Paid</Badge>);
    const badge = screen.getByText("Paid");
    expect(badge.className).toContain("text-success");
  });

  it("applies red variant classes", () => {
    render(<Badge variant="red">Overdue</Badge>);
    const badge = screen.getByText("Overdue");
    expect(badge.className).toContain("text-danger");
  });

  it("applies yellow variant classes", () => {
    render(<Badge variant="yellow">Pending</Badge>);
    const badge = screen.getByText("Pending");
    expect(badge.className).toContain("text-warning");
  });

  it("applies beet variant classes", () => {
    render(<Badge variant="beet">New</Badge>);
    const badge = screen.getByText("New");
    expect(badge.className).toContain("text-beet-bright");
  });

  it("merges custom className", () => {
    render(<Badge className="my-custom">Label</Badge>);
    const badge = screen.getByText("Label");
    expect(badge.className).toContain("my-custom");
  });

  it("forwards HTML attributes", () => {
    render(<Badge data-testid="my-badge">Test</Badge>);
    expect(screen.getByTestId("my-badge")).toBeInTheDocument();
  });
});
