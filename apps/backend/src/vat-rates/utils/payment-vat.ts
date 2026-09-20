import { Prisma } from 'src/generated/client';

/** One entry of the VAT rate history — the fields resolution needs. */
export type VatRateEntry = {
  effectiveMonth: Date;
  percentage: Prisma.Decimal;
};

/**
 * Resolves the VAT percentage effective for a month against an already-loaded
 * rate history — the most recent entry effective on or before that month.
 *
 * Mirrors `VatRatesService.resolveForMonth`, but in memory: listings resolve
 * many payments at once and should cost one query, not one per row.
 * @param rates The full VAT rate history, in any order
 * @param date Any date within the month to resolve
 * @returns The effective percentage, or `null` if none is configured for that month or earlier
 */
export const resolveVatPercentage = (
  rates: VatRateEntry[],
  date: Date,
): number | null => {
  const monthStart = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);

  let effective: VatRateEntry | undefined;
  for (const rate of rates) {
    const effectiveFrom = rate.effectiveMonth.getTime();
    if (
      effectiveFrom <= monthStart &&
      (!effective || effectiveFrom > effective.effectiveMonth.getTime())
    ) {
      effective = rate;
    }
  }

  return effective ? effective.percentage.toNumber() : null;
};

/**
 * Derives a supplier payment's VAT figures from the choice to include VAT and
 * the global rate for the month the payment belongs to.
 *
 * `vatPercentage` is `null` when VAT is off, and also when it is on but no rate
 * has been configured for that month yet — in which case no VAT is added until
 * one is.
 * @param amount The payment amount before VAT
 * @param includesVat Whether the payment carries VAT
 * @param rates The full VAT rate history
 * @param month Any date within the month the payment belongs to (its report's date)
 */
export const derivePaymentVat = (
  amount: number,
  includesVat: boolean,
  rates: VatRateEntry[],
  month: Date,
): {
  vatPercentage: number | null;
  vatAmount: number;
  effectiveTotal: number;
} => {
  const vatPercentage = includesVat ? resolveVatPercentage(rates, month) : null;
  const vatAmount = vatPercentage ? amount * (vatPercentage / 100) : 0;

  return { vatPercentage, vatAmount, effectiveTotal: amount + vatAmount };
};
