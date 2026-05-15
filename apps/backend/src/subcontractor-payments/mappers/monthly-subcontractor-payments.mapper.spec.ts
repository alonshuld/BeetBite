import { Prisma } from 'src/generated/client';
import {
  toMonthlySubcontractorPaymentsResponse,
  toMonthlySubcontractorPaymentsResponseList,
} from './monthly-subcontractor-payments.mapper';

describe('monthly-subcontractor-payments mapper', () => {
  const serviceDate = new Date('2024-05-01T00:00:00.000Z');

  const makePayment = (
    amount: number,
    paymentDate: Date | null = new Date('2024-05-10T00:00:00.000Z'),
  ) => ({
    id: `payment-${amount}`,
    serviceDate,
    paymentDate,
    amount: new Prisma.Decimal(String(amount)),
  });

  const makeInput = (
    payments: ReturnType<typeof makePayment>[],
    expectedTotal = 1500,
  ) => ({
    id: 'sub-1',
    name: 'Sub 1',
    payments,
    expectedTotal,
    serviceDate,
  });

  describe('toMonthlySubcontractorPaymentsResponse', () => {
    it('should accumulate amountPaid across multiple partial payments', () => {
      const input = makeInput([
        makePayment(300),
        makePayment(200),
        makePayment(400),
      ]);

      const result = toMonthlySubcontractorPaymentsResponse(input);

      expect(result.amountPaid).toBe(900);
      expect(result.payments).toHaveLength(3);
    });

    it('should return amountOwed from expectedTotal', () => {
      const result = toMonthlySubcontractorPaymentsResponse(
        makeInput([makePayment(500)], 1200),
      );
      expect(result.amountOwed).toBe(1200);
    });

    it('should serialize null paymentDate in partial payments as null', () => {
      const input = makeInput([makePayment(500, null)]);

      const result = toMonthlySubcontractorPaymentsResponse(input);

      expect(result.payments[0].paymentDate).toBeNull();
    });

    it('should serialize non-null paymentDate in partial payments as ISO string', () => {
      const paymentDate = new Date('2024-05-15T00:00:00.000Z');
      const input = makeInput([makePayment(500, paymentDate)]);

      const result = toMonthlySubcontractorPaymentsResponse(input);

      expect(result.payments[0].paymentDate).toBe(paymentDate.toISOString());
    });

    it('should return zero amountPaid when there are no payments', () => {
      const result = toMonthlySubcontractorPaymentsResponse(makeInput([]));
      expect(result.amountPaid).toBe(0);
    });
  });

  describe('toMonthlySubcontractorPaymentsResponseList', () => {
    it('should map each subcontractor independently', () => {
      const inputs = [
        makeInput([makePayment(300), makePayment(200)], 600),
        makeInput([makePayment(1000)], 1500),
      ];
      inputs[1].id = 'sub-2';
      inputs[1].name = 'Sub 2';

      const results = toMonthlySubcontractorPaymentsResponseList(inputs);

      expect(results).toHaveLength(2);
      expect(results[0].amountPaid).toBe(500);
      expect(results[1].amountPaid).toBe(1000);
    });
  });
});
