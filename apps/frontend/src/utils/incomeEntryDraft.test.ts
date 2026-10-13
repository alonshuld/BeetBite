import { describe, expect, it } from "vite-plus/test";
import { draftIncomeAmount, isBlankIncomeDraft } from "./incomeEntryDraft";

describe("isBlankIncomeDraft", () => {
  it("is blank only when every field is empty", () => {
    expect(isBlankIncomeDraft({ amount: "", incomeDate: "", tag: "  " })).toBe(
      true,
    );
    expect(isBlankIncomeDraft({ amount: "0", incomeDate: "", tag: "" })).toBe(
      false,
    );
    expect(
      isBlankIncomeDraft({ amount: "", incomeDate: "2026-05-01", tag: "" }),
    ).toBe(false);
    expect(isBlankIncomeDraft({ amount: "", incomeDate: "", tag: "x" })).toBe(
      false,
    );
  });
});

describe("draftIncomeAmount", () => {
  it("reads an empty amount as 0", () => {
    expect(draftIncomeAmount("")).toBe(0);
  });

  it("keeps a typed amount", () => {
    expect(draftIncomeAmount("1")).toBe(1);
    expect(draftIncomeAmount("2500.5")).toBe(2500.5);
  });
});
