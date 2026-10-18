import {
  derivePaymentVat,
  type VatRateEntry,
} from 'src/vat-rates/utils/payment-vat';

/**
 * A month's income figures as the client sees them: the price (income
 * excluding VAT), the VAT on top when the report carries it, and the total the
 * client pays. VAT is derived from the global rate for the report's month,
 * exactly as for supplier payments — `vatPercentage` is `null` when VAT is off
 * or no rate is configured for that month yet.
 * @param income The report's income, excluding VAT
 * @param includesVat Whether the client pays VAT on top this month
 * @param rates The full VAT rate history
 * @param month Any date within the report's month
 */
export const deriveIncomeTotals = (
  income: number,
  includesVat: boolean,
  rates: VatRateEntry[],
  month: Date,
): {
  vatPercentage: number | null;
  vatAmount: number;
  totalWithVat: number;
} => {
  const { vatPercentage, vatAmount, effectiveTotal } = derivePaymentVat(
    income,
    includesVat,
    rates,
    month,
  );
  return { vatPercentage, vatAmount, totalWithVat: effectiveTotal };
};

/**
 * The part of what the client paid that settles the price itself, without the
 * VAT riding on it. Project payment progress compares against the project's
 * estimated amount, which carries no VAT, so a payment of 117 against a
 * 100 + 17% month moves the project by 100, not 117.
 * @param paid Sum of the report's client payments
 * @param income The report's income, excluding VAT
 * @param totalWithVat The report's income plus VAT (equal to income when no VAT)
 */
export const paidTowardsIncome = (
  paid: number,
  income: number,
  totalWithVat: number,
): number => (totalWithVat > 0 ? (paid * income) / totalWithVat : 0);

/** Compares two money amounts in agorot, so float noise cannot tip it. */
export const exceedsInAgorot = (amount: number, limit: number): boolean =>
  Math.round(amount * 100) > Math.round(limit * 100);
