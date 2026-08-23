import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReactElement } from "react";
import { LangProvider } from "@/contexts/LangContext";
import { Modal, ConfirmModal, FormModal } from "./Modal";

function withLang(ui: ReactElement) {
  return render(<LangProvider>{ui}</LangProvider>);
}

describe("Modal", () => {
  it("does not render content when closed", () => {
    withLang(
      <Modal open={false} onClose={vi.fn()}>
        <p>Content</p>
      </Modal>,
    );
    expect(screen.queryByText("Content")).not.toBeInTheDocument();
  });

  it("renders title and children when open", () => {
    withLang(
      <Modal open onClose={vi.fn()} title="Test Modal">
        <p>Modal content</p>
      </Modal>,
    );
    expect(screen.getByText("Test Modal")).toBeInTheDocument();
    expect(screen.getByText("Modal content")).toBeInTheDocument();
  });

  it("renders close button when title present", () => {
    withLang(
      <Modal open onClose={vi.fn()} title="Test Modal">
        <p>Content</p>
      </Modal>,
    );
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("calls onClose when close button clicked", async () => {
    const onClose = vi.fn();
    withLang(
      <Modal open onClose={onClose} title="Test Modal">
        <p>Content</p>
      </Modal>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when overlay clicked", async () => {
    const onClose = vi.fn();
    const { container } = withLang(
      <Modal open onClose={onClose}>
        <p>Content</p>
      </Modal>,
    );
    await userEvent.click(container.firstChild as Element);
    expect(onClose).toHaveBeenCalled();
  });

  it("does not call onClose when inner content clicked", async () => {
    const onClose = vi.fn();
    withLang(
      <Modal open onClose={onClose} title="Test">
        <p>Content</p>
      </Modal>,
    );
    await userEvent.click(screen.getByText("Content"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose on Escape key", async () => {
    const onClose = vi.fn();
    withLang(
      <Modal open onClose={onClose} title="Test">
        <p>Content</p>
      </Modal>,
    );
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("renders footer when provided", () => {
    withLang(
      <Modal open onClose={vi.fn()} footer={<button>Footer Action</button>}>
        <p>Content</p>
      </Modal>,
    );
    expect(
      screen.getByRole("button", { name: "Footer Action" }),
    ).toBeInTheDocument();
  });
});

describe("ConfirmModal", () => {
  it("does not render when closed", () => {
    withLang(
      <ConfirmModal
        open={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        message="Are you sure?"
      />,
    );
    expect(screen.queryByText("Are you sure?")).not.toBeInTheDocument();
  });

  it("renders message and action buttons when open", () => {
    withLang(
      <ConfirmModal
        open
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        message="Are you sure?"
      />,
    );
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("calls onConfirm when delete button clicked", async () => {
    const onConfirm = vi.fn();
    withLang(
      <ConfirmModal
        open
        onClose={vi.fn()}
        onConfirm={onConfirm}
        message="Are you sure?"
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("calls onClose when cancel button clicked", async () => {
    const onClose = vi.fn();
    withLang(
      <ConfirmModal
        open
        onClose={onClose}
        onConfirm={vi.fn()}
        message="Are you sure?"
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("renders title when provided", () => {
    withLang(
      <ConfirmModal
        open
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        message="msg"
        title="Confirm Delete"
      />,
    );
    expect(screen.getByText("Confirm Delete")).toBeInTheDocument();
  });
});

describe("FormModal", () => {
  it("does not render when closed", () => {
    withLang(
      <FormModal open={false} onClose={vi.fn()} onSubmit={vi.fn()}>
        <p>Form content</p>
      </FormModal>,
    );
    expect(screen.queryByText("Form content")).not.toBeInTheDocument();
  });

  it("renders children and save/cancel buttons when open", () => {
    withLang(
      <FormModal open onClose={vi.fn()} onSubmit={vi.fn()} title="Add Item">
        <input placeholder="Item name" />
      </FormModal>,
    );
    expect(screen.getByPlaceholderText("Item name")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("calls onSubmit when save button clicked", async () => {
    const onSubmit = vi.fn();
    withLang(
      <FormModal open onClose={vi.fn()} onSubmit={onSubmit} title="Add Item">
        <p>Form</p>
      </FormModal>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("calls onClose when cancel button clicked", async () => {
    const onClose = vi.fn();
    withLang(
      <FormModal open onClose={onClose} onSubmit={vi.fn()} title="Add Item">
        <p>Form</p>
      </FormModal>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("shows loading indicator when loading prop set", () => {
    withLang(
      <FormModal open onClose={vi.fn()} onSubmit={vi.fn()} loading>
        <p>Form</p>
      </FormModal>,
    );
    expect(screen.getByText("…")).toBeInTheDocument();
  });

  it("disables buttons when loading", () => {
    withLang(
      <FormModal open onClose={vi.fn()} onSubmit={vi.fn()} loading>
        <p>Form</p>
      </FormModal>,
    );
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });
});
