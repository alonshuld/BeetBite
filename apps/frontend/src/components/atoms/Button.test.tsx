import { describe, it, expect, vi } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  ButtonPrimary,
  ButtonGhost,
  ButtonDanger,
  ButtonIcon,
  LinkButton,
} from "./Button";

describe("ButtonPrimary", () => {
  it("renders children", () => {
    render(<ButtonPrimary>Save</ButtonPrimary>);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("calls onClick handler", async () => {
    const onClick = vi.fn();
    render(<ButtonPrimary onClick={onClick}>Save</ButtonPrimary>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("is disabled when disabled prop set", () => {
    render(<ButtonPrimary disabled>Save</ButtonPrimary>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("does not fire onClick when disabled", async () => {
    const onClick = vi.fn();
    render(
      <ButtonPrimary disabled onClick={onClick}>
        Save
      </ButtonPrimary>,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("ButtonGhost", () => {
  it("renders and is clickable", async () => {
    const onClick = vi.fn();
    render(<ButtonGhost onClick={onClick}>Cancel</ButtonGhost>);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("is disabled when disabled prop set", () => {
    render(<ButtonGhost disabled>Cancel</ButtonGhost>);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});

describe("ButtonDanger", () => {
  it("renders and is clickable", async () => {
    const onClick = vi.fn();
    render(<ButtonDanger onClick={onClick}>Delete</ButtonDanger>);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("applies danger color class", () => {
    render(<ButtonDanger>Delete</ButtonDanger>);
    expect(screen.getByRole("button").className).toContain("text-danger");
  });
});

describe("ButtonIcon", () => {
  it("renders children", () => {
    render(<ButtonIcon aria-label="Edit">✎</ButtonIcon>);
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });
});

describe("LinkButton", () => {
  it("renders as button element", () => {
    render(<LinkButton>View details</LinkButton>);
    expect(
      screen.getByRole("button", { name: "View details" }),
    ).toBeInTheDocument();
  });

  it("calls onClick handler", async () => {
    const onClick = vi.fn();
    render(<LinkButton onClick={onClick}>View details</LinkButton>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
