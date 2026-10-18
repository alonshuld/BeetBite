import { Prisma } from 'src/generated/client';
import { deriveIncomeTotals } from './income-totals';

const rates = [
  {
    effectiveMonth: new Date('2025-01-01'),
    percentage: new Prisma.Decimal(18),
  },
];

describe('deriveIncomeTotals', () => {
  it('adds the rate in force for the month', () => {
    expect(deriveIncomeTotals(1000, rates, new Date('2026-05-01'))).toEqual({
      vatPercentage: 18,
      vatAmount: 180,
      totalWithVat: 1180,
    });
  });

  it('adds nothing when no rate covers the month yet', () => {
    expect(deriveIncomeTotals(1000, rates, new Date('2024-05-01'))).toEqual({
      vatPercentage: null,
      vatAmount: 0,
      totalWithVat: 1000,
    });
  });
});
