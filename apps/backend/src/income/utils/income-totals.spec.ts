import { Prisma } from 'src/generated/client';
import { deriveIncomeTotals, exceedsInAgorot } from './income-totals';

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

describe('exceedsInAgorot', () => {
  it('ignores floating-point noise below an agora', () => {
    expect(exceedsInAgorot(0.1 + 0.2, 0.3)).toBe(false);
  });

  it('catches a single agora over', () => {
    expect(exceedsInAgorot(100.01, 100)).toBe(true);
  });
});
