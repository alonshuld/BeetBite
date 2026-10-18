import { Prisma } from 'src/generated/client';
import {
  deriveIncomeTotals,
  exceedsInAgorot,
  paidTowardsIncome,
} from './income-totals';

const rates = [
  {
    effectiveMonth: new Date('2025-01-01'),
    percentage: new Prisma.Decimal(18),
  },
];

describe('deriveIncomeTotals', () => {
  it('adds the rate in force for the month when VAT is on', () => {
    expect(
      deriveIncomeTotals(1000, true, rates, new Date('2026-05-01')),
    ).toEqual({ vatPercentage: 18, vatAmount: 180, totalWithVat: 1180 });
  });

  it('adds nothing when VAT is off', () => {
    expect(
      deriveIncomeTotals(1000, false, rates, new Date('2026-05-01')),
    ).toEqual({ vatPercentage: null, vatAmount: 0, totalWithVat: 1000 });
  });

  it('adds nothing when no rate covers the month yet', () => {
    expect(
      deriveIncomeTotals(1000, true, rates, new Date('2024-05-01')),
    ).toEqual({ vatPercentage: null, vatAmount: 0, totalWithVat: 1000 });
  });
});

describe('paidTowardsIncome', () => {
  it('takes the VAT share off a payment', () => {
    expect(paidTowardsIncome(1180, 1000, 1180)).toBe(1000);
    expect(paidTowardsIncome(590, 1000, 1180)).toBeCloseTo(500, 9);
  });

  it('is the payment itself without VAT', () => {
    expect(paidTowardsIncome(400, 1000, 1000)).toBe(400);
  });

  it('is zero when nothing is owed', () => {
    expect(paidTowardsIncome(0, 0, 0)).toBe(0);
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
