import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { ToastProvider } from "./ToastContext";
import { useToast } from "./useToast";

interface TriggerProps {
  message?: string;
  variant?: "success" | "error" | "info";
}

function ToastTrigger({ message = "Hello", variant }: TriggerProps) {
  const { toast } = useToast();
  return <button onClick={() => toast(message, variant)}>Show toast</button>;
}

describe("ToastContext / ToastProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders toast message when triggered", () => {
    render(
      <ToastProvider>
        <ToastTrigger message="Operation complete" />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("Show toast"));
    expect(screen.getByText("Operation complete")).toBeInTheDocument();
  });

  it("shows success icon for success variant", () => {
    render(
      <ToastProvider>
        <ToastTrigger message="Done" variant="success" />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("Show toast"));
    expect(document.querySelector('[data-icon="check"]')).toBeInTheDocument();
  });

  it("shows error icon for error variant", () => {
    render(
      <ToastProvider>
        <ToastTrigger message="Failed" variant="error" />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("Show toast"));
    expect(document.querySelector('[data-icon="alert"]')).toBeInTheDocument();
  });

  it("shows info icon for default (info) variant", () => {
    render(
      <ToastProvider>
        <ToastTrigger message="Info" />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("Show toast"));
    expect(document.querySelector('[data-icon="inbox"]')).toBeInTheDocument();
  });

  it("auto-dismisses after 3 seconds", () => {
    render(
      <ToastProvider>
        <ToastTrigger message="Temporary" />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("Show toast"));
    expect(screen.getByText("Temporary")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.queryByText("Temporary")).not.toBeInTheDocument();
  });

  it("keeps an error up long enough to read which fields to fix", () => {
    render(
      <ToastProvider>
        <ToastTrigger message="Broken" variant="error" />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("Show toast"));
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Broken");
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByText("Broken")).not.toBeInTheDocument();
  });

  it("dismisses toast when X button clicked", () => {
    render(
      <ToastProvider>
        <ToastTrigger message="Dismiss me" />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("Show toast"));
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText("Dismiss me")).not.toBeInTheDocument();
  });

  it("stacks multiple toasts", () => {
    render(
      <ToastProvider>
        <ToastTrigger message="Toast msg" />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("Show toast"));
    fireEvent.click(screen.getByText("Show toast"));
    expect(screen.getAllByText("Toast msg")).toHaveLength(2);
  });
});
