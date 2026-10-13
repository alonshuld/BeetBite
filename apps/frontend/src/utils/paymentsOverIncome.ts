/** A report's income and the total of its supplier payments. */
export interface IncomeAndPayments {
  income: number;
  payments: number;
}

/** Sums `amount` across rows — income entries or supplier payments. */
export function sumAmounts(rows: { amount: number }[]): number {
  return rows.reduce((sum, row) => sum + row.amount, 0);
}

// Compared in whole agorot, so float noise on equal amounts never warns.
const toAgorot = (shekels: number): number => Math.round(shekels * 100);

/**
 * True when a save leaves a report's supplier payments above its income, and
 * the save itself is what moved it there or further: more payments or less
 * income than before. A report that was already over and is only being
 * relabelled does not warn again.
 *
 * Payments above income leave the subcontractor a negative remainder (see
 * `computeSubcontractorRemainder`). It is allowed, just rarely meant.
 */
export function goesOverIncome(
  before: IncomeAndPayments,
  after: IncomeAndPayments,
): boolean {
  if (toAgorot(after.payments) <= toAgorot(after.income)) return false;
  return (
    toAgorot(after.payments) > toAgorot(before.payments) ||
    toAgorot(after.income) < toAgorot(before.income)
  );
}

/** Before-state of a report that does not exist yet. */
export const NEW_REPORT: IncomeAndPayments = { income: 0, payments: 0 };
