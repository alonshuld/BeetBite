import { describe, it, expect, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LangProvider } from "./LangContext";
import { useLang } from "./useLang";

function LangDisplay() {
  const { lang, isRTL, t, setLang } = useLang();
  return (
    <div>
      <span data-testid="lang">{lang}</span>
      <span data-testid="dir">{isRTL ? "rtl" : "ltr"}</span>
      <span data-testid="translation">{t("clients")}</span>
      <button onClick={() => setLang("he")}>Switch to HE</button>
      <button onClick={() => setLang("en")}>Switch to EN</button>
    </div>
  );
}

describe("LangContext / LangProvider", () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.dir = "ltr";
    document.documentElement.lang = "en";
  });

  it("provides default lang of 'en'", () => {
    render(
      <LangProvider>
        <LangDisplay />
      </LangProvider>,
    );
    expect(screen.getByTestId("lang")).toHaveTextContent("en");
  });

  it("isRTL is false for 'en'", () => {
    render(
      <LangProvider>
        <LangDisplay />
      </LangProvider>,
    );
    expect(screen.getByTestId("dir")).toHaveTextContent("ltr");
  });

  it("t() returns correct EN translation", () => {
    render(
      <LangProvider>
        <LangDisplay />
      </LangProvider>,
    );
    expect(screen.getByTestId("translation")).toHaveTextContent("Clients");
  });

  it("setLang switches to 'he'", async () => {
    render(
      <LangProvider>
        <LangDisplay />
      </LangProvider>,
    );
    await userEvent.click(screen.getByText("Switch to HE"));
    expect(screen.getByTestId("lang")).toHaveTextContent("he");
  });

  it("isRTL is true after switching to 'he'", async () => {
    render(
      <LangProvider>
        <LangDisplay />
      </LangProvider>,
    );
    await userEvent.click(screen.getByText("Switch to HE"));
    expect(screen.getByTestId("dir")).toHaveTextContent("rtl");
  });

  it("t() returns Hebrew translation after lang change", async () => {
    render(
      <LangProvider>
        <LangDisplay />
      </LangProvider>,
    );
    await userEvent.click(screen.getByText("Switch to HE"));
    expect(screen.getByTestId("translation")).toHaveTextContent("לקוחות");
  });

  it("persists lang to localStorage", async () => {
    render(
      <LangProvider>
        <LangDisplay />
      </LangProvider>,
    );
    await userEvent.click(screen.getByText("Switch to HE"));
    expect(localStorage.getItem("beetbite.lang")).toBe("he");
  });

  it("sets document.documentElement.dir to rtl", async () => {
    render(
      <LangProvider>
        <LangDisplay />
      </LangProvider>,
    );
    await userEvent.click(screen.getByText("Switch to HE"));
    expect(document.documentElement.dir).toBe("rtl");
  });

  it("reads initial lang from localStorage", () => {
    localStorage.setItem("beetbite.lang", "he");
    render(
      <LangProvider>
        <LangDisplay />
      </LangProvider>,
    );
    expect(screen.getByTestId("lang")).toHaveTextContent("he");
  });

  it("sets document.lang attribute", async () => {
    render(
      <LangProvider>
        <LangDisplay />
      </LangProvider>,
    );
    await userEvent.click(screen.getByText("Switch to HE"));
    expect(document.documentElement.lang).toBe("he");
  });
});
