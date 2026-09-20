import { Prisma } from 'src/generated/client';
import { derivePaymentVat, resolveVatPercentage } from './payment-vat';

const rate = (effectiveMonth: string, percentage: string) => ({
  effectiveMonth: new Date(effectiveMonth),
  percentage: new Prisma.Decimal(percentage),
});

describe('payment-vat', () => {
  // Deliberately out of order: resolution must not rely on the sort.
  const rates = [
    rate('2026-04-01T00:00:00.000Z', '18'),
    rate('2025-01-01T00:00:00.000Z', '17'),
    rate('2026-09-01T00:00:00.000Z', '19'),
  ];

  describe('resolveVatPercentage', () => {
    it('returns null when no rate has been configured', () => {
      expect(resolveVatPercentage([], new Date('2026-05-10'))).toBeNull();
    });

    it('returns null for a month before the first configured rate', () => {
      expect(
        resolveVatPercentage(rates, new Date('2024-12-31T00:00:00.000Z')),
      ).toBeNull();
    });

    it('returns the rate whose effective month is the queried month', () => {
      expect(
        resolveVatPercentage(rates, new Date('2026-04-01T00:00:00.000Z')),
      ).toBe(18);
    });

    it('matches on the month, whatever the day within it', () => {
      expect(
        resolveVatPercentage(rates, new Date('2026-04-30T23:59:59.000Z')),
      ).toBe(18);
    });

    it('carries the latest earlier rate forward to later months', () => {
      expect(
        resolveVatPercentage(rates, new Date('2026-08-15T00:00:00.000Z')),
      ).toBe(18);
      expect(
        resolveVatPercentage(rates, new Date('2027-02-01T00:00:00.000Z')),
      ).toBe(19);
    });

    it('does not let a later rate change an earlier month', () => {
      expect(
        resolveVatPercentage(rates, new Date('2025-06-01T00:00:00.000Z')),
      ).toBe(17);
    });
  });

  describe('derivePaymentVat', () => {
    const month = new Date('2026-05-01T00:00:00.000Z');

    it("applies the month's rate when VAT is included", () => {
      expect(derivePaymentVat(1000, true, rates, month)).toEqual({
        vatPercentage: 18,
        vatAmount: 180,
        effectiveTotal: 1180,
      });
    });

    it('adds nothing when VAT is not included, even if a rate exists', () => {
      expect(derivePaymentVat(1000, false, rates, month)).toEqual({
        vatPercentage: null,
        vatAmount: 0,
        effectiveTotal: 1000,
      });
    });

    it('adds nothing when VAT is included but no rate is configured yet', () => {
      expect(derivePaymentVat(1000, true, [], month)).toEqual({
        vatPercentage: null,
        vatAmount: 0,
        effectiveTotal: 1000,
      });
    });

    it('adds nothing at a 0% rate', () => {
      expect(
        derivePaymentVat(
          1000,
          true,
          [rate('2026-01-01T00:00:00.000Z', '0')],
          month,
        ),
      ).toEqual({ vatPercentage: 0, vatAmount: 0, effectiveTotal: 1000 });
    });
  });
});
