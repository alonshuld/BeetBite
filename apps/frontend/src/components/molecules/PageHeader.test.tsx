import { describe, it, expect } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import { PageHeader } from "./PageHeader";

describe("PageHeader", () => {
  it("renders title as h1", () => {
    render(<PageHeader title="Projects" />);
    expect(
      screen.getByRole("heading", { name: "Projects", level: 1 }),
    ).toBeInTheDocument();
  });

  it("renders subtitle when provided", () => {
    render(
      <PageHeader title="Projects" subtitle="All construction projects" />,
    );
    expect(screen.getByText("All construction projects")).toBeInTheDocument();
  });

  it("does not render subtitle when omitted", () => {
    render(<PageHeader title="Projects" />);
    expect(
      screen.queryByText("All construction projects"),
    ).not.toBeInTheDocument();
  });

  it("renders actions when provided", () => {
    render(
      <PageHeader title="Projects" actions={<button>Add Project</button>} />,
    );
    expect(
      screen.getByRole("button", { name: "Add Project" }),
    ).toBeInTheDocument();
  });

  it("works with title only (no optional props)", () => {
    render(<PageHeader title="Dashboard" />);
    expect(
      screen.getByRole("heading", { name: "Dashboard" }),
    ).toBeInTheDocument();
  });

  it("merges custom className", () => {
    const { container } = render(
      <PageHeader title="Test" className="custom-class" />,
    );
    expect((container.firstChild as HTMLElement).className).toContain(
      "custom-class",
    );
  });
});
