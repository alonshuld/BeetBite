/**
 * Amounts on screen. A whole number keeps no decimals (₪1,234); anything with
 * a fraction shows exactly two digits after the point (₪1,234.50), never the
 * one or three that a bare `toLocaleString` would print.
 */
export function formatNumber(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  const digits = Number.isInteger(rounded) ? 0 : 2;
  return rounded.toLocaleString("he-IL", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatILS(n: number): string {
  return `₪${formatNumber(n)}`;
}

/**
 * An amount rounded to whole agorot — the precision the server stores and
 * checks payments against. Use it for any amount the user is offered to pay,
 * so a figure computed in floats (7988.6000000001) is neither rounded to
 * whole shekels nor carries noise past the agora.
 */
export function roundToAgorot(n: number): number {
  return Math.round(n * 100) / 100;
}
