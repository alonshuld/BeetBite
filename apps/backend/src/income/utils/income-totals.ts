import {
  resolveVatPercentage,
  type VatRateEntry,
} from 'src/vat-rates/utils/payment-vat';

/**
 * A month's income as the turnover summary shows it: the income itself, the
 * VAT the client pays on top of it, and the two together. Every project's
 * income carries VAT there, at the global rate for the report's month;
 * `vatPercentage` is `null` when no rate is configured for that month yet, and
 * then no VAT is added until one is.
 * @param income The report's income, excluding VAT
 * @param rates The full VAT rate history
 * @param month Any date within the report's month
 */
export const deriveIncomeTotals = (
  income: number,
  rates: VatRateEntry[],
  month: Date,
): {
  vatPercentage: number | null;
  vatAmount: number;
  totalWithVat: number;
} => {
  const vatPercentage = resolveVatPercentage(rates, month);
  const vatAmount = vatPercentage ? (income * vatPercentage) / 100 : 0;
  return { vatPercentage, vatAmount, totalWithVat: income + vatAmount };
};
