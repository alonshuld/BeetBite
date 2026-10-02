import { Prisma } from 'src/generated/client';
import {
  toMonthlySubcontractorPaymentsResponse,
  toMonthlySubcontractorPaymentsResponseList,
} from './monthly-subcontractor-payments.mapper';

describe('monthly-subcontractor-payments mapper', () => {
  const serviceDate = new Date('2024-05-01T00:00:00.000Z');

  const makePayment = (amount: number, paymentDate: Date | null = null) => ({
    id: `payment-${amount}`,
    projectId: 'project-1',
    serviceDate,
    amount: new Prisma.Decimal(String(amount)),
    isPaid: false,
    paymentDate,
    description: null as string | null,
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

    it('should return zero amountPaid when there are no payments', () => {
      const result = toMonthlySubcontractorPaymentsResponse(makeInput([]));
      expect(result.amountPaid).toBe(0);
    });

    // This test used to assert the opposite — that paymentDate was absent —
    // guarding the old "a row means it was paid, so a date is redundant"
    // design. The contractor needs the day the money actually moved, so the
    // field is back and the assertion is inverted deliberately, not weakened.
    it('should include paymentDate on nested payments', () => {
      const result = toMonthlySubcontractorPaymentsResponse(
        makeInput([makePayment(500, new Date('2024-05-17T00:00:00.000Z'))]),
      );
      expect(result.payments[0].paymentDate).toBe('2024-05-17T00:00:00.000Z');
    });

    it('should include description on nested payments', () => {
      const result = toMonthlySubcontractorPaymentsResponse(
        makeInput([{ ...makePayment(500), description: 'Cheque #1042' }]),
      );
      expect(result.payments[0].description).toBe('Cheque #1042');
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

  // Several partial payments in one month each carry their own date — that is
  // the whole point of the field, and what the card lists line by line.
  it('carries each payment\u2019s own date through', () => {
    const result = toMonthlySubcontractorPaymentsResponse(
      makeInput([
        makePayment(500, new Date('2024-05-03T00:00:00.000Z')),
        makePayment(700, new Date('2024-05-19T00:00:00.000Z')),
      ]),
    );

    expect(result.payments.map((payment) => payment.paymentDate)).toEqual([
      '2024-05-03T00:00:00.000Z',
      '2024-05-19T00:00:00.000Z',
    ]);
    // The month being settled is unchanged by any of it.
    expect(result.serviceDate).toBe('2024-05-01T00:00:00.000Z');
  });

  it('maps a payment with no date to null', () => {
    const result = toMonthlySubcontractorPaymentsResponse(
      makeInput([makePayment(500)]),
    );
    expect(result.payments[0].paymentDate).toBeNull();
  });
});
