import { describe, it, expect } from "vite-plus/test";
import { formatYM, formatISODate } from "./formatMonth";

describe("formatYM", () => {
  it("formats year-month string in English short format", () => {
    const result = formatYM("2024-03", "en", "short");
    expect(result).toMatch(/Mar|March/);
    expect(result).toMatch(/2024/);
  });

  it("formats year-month string in English long format", () => {
    const result = formatYM("2024-03", "en", "long");
    expect(result).toContain("2024");
    expect(result).toMatch(/March/);
  });

  it("formats year-month string in Hebrew", () => {
    const result = formatYM("2024-01", "he");
    expect(result).toMatch(/2024/);
  });

  it("defaults to short format", () => {
    const short = formatYM("2024-06", "en", "short");
    const defaultFmt = formatYM("2024-06", "en");
    expect(defaultFmt).toBe(short);
  });

  it("handles December correctly", () => {
    const result = formatYM("2023-12", "en", "long");
    expect(result).toContain("December");
    expect(result).toContain("2023");
  });

  it("handles January correctly", () => {
    const result = formatYM("2025-01", "en", "long");
    expect(result).toContain("January");
    expect(result).toContain("2025");
  });
});

describe("formatISODate", () => {
  it("formats ISO date string in English", () => {
    const result = formatISODate("2024-06-15T00:00:00.000Z", "en");
    expect(result).toMatch(/2024/);
  });

  it("formats ISO date string in Hebrew", () => {
    const result = formatISODate("2024-06-15T00:00:00.000Z", "he");
    expect(result).toMatch(/2024/);
  });

  it("accepts custom format options", () => {
    const result = formatISODate("2024-06-15T00:00:00.000Z", "en", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    expect(result).toContain("2024");
  });
});
