import { describe, it, expect } from "vite-plus/test";
import { formatILS, formatNumber, roundToAgorot } from "./formatMoney";

describe("formatNumber", () => {
  it("keeps whole numbers without decimals", () => {
    expect(formatNumber(1234)).toBe("1,234");
    expect(formatNumber(0)).toBe("0");
  });

  it("pads a single decimal digit to two", () => {
    expect(formatNumber(1234.5)).toBe("1,234.50");
  });

  it("rounds three or more decimal digits to two", () => {
    expect(formatNumber(10.125)).toBe("10.13");
    expect(formatNumber(1 / 3)).toBe("0.33");
  });

  it("drops the decimals when they round away", () => {
    expect(formatNumber(99.999)).toBe("100");
    expect(formatNumber(0.1 + 0.2)).toBe("0.30");
  });

  it("formats negative amounts", () => {
    // he-IL marks the sign with a bidi control; compare the visible text.
    expect(formatNumber(-1500.5).replace(/\p{Cf}/gu, "")).toBe("-1,500.50");
  });
});

describe("formatILS", () => {
  it("prefixes the shekel sign", () => {
    expect(formatILS(2500.4)).toBe("₪2,500.40");
    expect(formatILS(2500)).toBe("₪2,500");
  });
});

describe("roundToAgorot", () => {
  it("keeps agorot instead of rounding to whole shekels", () => {
    expect(roundToAgorot(7988.6)).toBe(7988.6);
    expect(roundToAgorot(7988.44)).toBe(7988.44);
  });

  it("drops float noise past the agora", () => {
    expect(roundToAgorot(7988.6 - 0.6)).toBe(7988);
    expect(roundToAgorot(0.1 + 0.2)).toBe(0.3);
  });
});
