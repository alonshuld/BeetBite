import { describe, expect, it } from "vite-plus/test";
import { NEW_REPORT, goesOverIncome, sumAmounts } from "./paymentsOverIncome";

describe("sumAmounts", () => {
  it("sums amounts, 0 for none", () => {
    expect(sumAmounts([{ amount: 1.5 }, { amount: 2 }])).toBe(3.5);
    expect(sumAmounts([])).toBe(0);
  });
});

describe("goesOverIncome", () => {
  it("warns when a new report's payments exceed its income", () => {
    expect(goesOverIncome(NEW_REPORT, { income: 1, payments: 5000 })).toBe(
      true,
    );
  });

  it("does not warn when payments equal the income", () => {
    expect(goesOverIncome(NEW_REPORT, { income: 5000, payments: 5000 })).toBe(
      false,
    );
  });

  it("ignores float noise on equal amounts", () => {
    expect(
      goesOverIncome(NEW_REPORT, { income: 0.3, payments: 0.1 + 0.2 }),
    ).toBe(false);
  });

  it("does not warn for a report with no income and no payments", () => {
    expect(goesOverIncome(NEW_REPORT, NEW_REPORT)).toBe(false);
  });

  it("warns when an added payment tips the report over", () => {
    expect(
      goesOverIncome(
        { income: 1000, payments: 800 },
        { income: 1000, payments: 1100 },
      ),
    ).toBe(true);
  });

  it("warns when lowering the income tips the report over", () => {
    expect(
      goesOverIncome(
        { income: 1000, payments: 800 },
        { income: 500, payments: 800 },
      ),
    ).toBe(true);
  });

  it("warns again when a report already over gets more payments", () => {
    expect(
      goesOverIncome(
        { income: 1, payments: 5000 },
        { income: 1, payments: 6000 },
      ),
    ).toBe(true);
  });

  it("does not warn when a report already over is left as it was", () => {
    expect(
      goesOverIncome(
        { income: 1, payments: 5000 },
        { income: 1, payments: 5000 },
      ),
    ).toBe(false);
  });

  it("does not warn when a report already over gets closer to even", () => {
    expect(
      goesOverIncome(
        { income: 1, payments: 5000 },
        { income: 1, payments: 4000 },
      ),
    ).toBe(false);
  });
});
