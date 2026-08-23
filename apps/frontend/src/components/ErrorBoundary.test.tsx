import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { LangProvider } from "@/contexts/LangContext";
import { ErrorBoundary, ErrorFallback } from "./ErrorBoundary";

function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error("Test error");
  return <p>Normal content</p>;
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renders children when no error", () => {
    render(
      <LangProvider>
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      </LangProvider>,
    );
    expect(screen.getByText("Normal content")).toBeInTheDocument();
  });

  it("shows error fallback UI when child throws", () => {
    render(
      <LangProvider>
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      </LangProvider>,
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("shows error description in fallback", () => {
    render(
      <LangProvider>
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      </LangProvider>,
    );
    expect(
      screen.getByText("An unexpected error occurred. Please reload the page."),
    ).toBeInTheDocument();
  });

  it("shows reload button in fallback", () => {
    render(
      <LangProvider>
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      </LangProvider>,
    );
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
  });

  it("does not show fallback when there is no error", () => {
    render(
      <LangProvider>
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      </LangProvider>,
    );
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });
});

describe("ErrorFallback", () => {
  it("renders error title and reload button", () => {
    render(
      <LangProvider>
        <ErrorFallback />
      </LangProvider>,
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
  });

  it("renders error description", () => {
    render(
      <LangProvider>
        <ErrorFallback />
      </LangProvider>,
    );
    expect(
      screen.getByText("An unexpected error occurred. Please reload the page."),
    ).toBeInTheDocument();
  });
});
