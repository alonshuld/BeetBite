import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatCard } from "./StatCard";

describe("StatCard", () => {
  it("renders label and value", () => {
    render(<StatCard label="Total Income" value="₪12,500" />);
    expect(screen.getByText("Total Income")).toBeInTheDocument();
    expect(screen.getByText("₪12,500")).toBeInTheDocument();
  });

  it("renders numeric value", () => {
    render(<StatCard label="Projects" value={42} />);
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders sub text when provided", () => {
    render(<StatCard label="Profit" value="₪3,000" sub="vs last month" />);
    expect(screen.getByText("vs last month")).toBeInTheDocument();
  });

  it("does not render sub element when sub prop omitted", () => {
    render(<StatCard label="Profit" value="₪3,000" />);
    expect(screen.queryByText("vs last month")).not.toBeInTheDocument();
  });

  it("merges custom className", () => {
    const { container } = render(
      <StatCard label="X" value="Y" className="extra" />,
    );
    expect(container.firstChild).toHaveClass("extra");
  });

  it("forwards HTML div attributes", () => {
    render(<StatCard label="X" value="Y" data-testid="stat-card" />);
    expect(screen.getByTestId("stat-card")).toBeInTheDocument();
  });
});
