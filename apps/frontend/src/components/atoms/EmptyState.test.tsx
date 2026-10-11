import { describe, it, expect, vi } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders title", () => {
    render(<EmptyState title="No items" />);
    expect(screen.getByText("No items")).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(<EmptyState title="No items" description="Add your first item" />);
    expect(screen.getByText("Add your first item")).toBeInTheDocument();
  });

  it("does not render description when omitted", () => {
    render(<EmptyState title="No items" />);
    expect(screen.queryByText("Add your first item")).not.toBeInTheDocument();
  });

  it("renders icon when provided", () => {
    render(<EmptyState icon="🎉" title="No items" />);
    expect(screen.getByText("🎉")).toBeInTheDocument();
  });

  it("does not render icon container when icon omitted", () => {
    const { container } = render(<EmptyState title="No items" />);
    expect(container.querySelector(".opacity-40")).not.toBeInTheDocument();
  });

  it("renders action when provided", () => {
    render(<EmptyState title="No items" action={<button>Add item</button>} />);
    expect(
      screen.getByRole("button", { name: "Add item" }),
    ).toBeInTheDocument();
  });

  it("calls action onClick", async () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        title="No items"
        action={<button onClick={onClick}>Add item</button>}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Add item" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("merges custom className", () => {
    const { container } = render(
      <EmptyState title="No items" className="custom-class" />,
    );
    expect((container.firstChild as HTMLElement).className).toContain(
      "custom-class",
    );
  });
});
