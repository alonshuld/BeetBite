import { describe, it, expect } from "vite-plus/test";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/renderWithProviders";
import NotFoundPage from "./NotFoundPage";

function renderNotFoundPage() {
  return renderWithProviders(<NotFoundPage />, {
    initialEntries: ["/not-found"],
  });
}

describe("NotFoundPage", () => {
  it("renders 404 heading", () => {
    renderNotFoundPage();
    expect(screen.getByText("404")).toBeInTheDocument();
  });

  it("renders page not found message", () => {
    renderNotFoundPage();
    expect(screen.getByText("Page not found")).toBeInTheDocument();
  });

  it("renders page description", () => {
    renderNotFoundPage();
    expect(
      screen.getByText(
        "The page you're looking for doesn't exist or was moved.",
      ),
    ).toBeInTheDocument();
  });

  it("renders go to dashboard button", () => {
    renderNotFoundPage();
    expect(
      screen.getByRole("button", { name: /go to dashboard/i }),
    ).toBeInTheDocument();
  });
});
