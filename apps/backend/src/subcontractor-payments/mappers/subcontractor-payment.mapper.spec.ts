import { Prisma } from 'src/generated/client';
import { toSubcontractorPaymentResponse } from './subcontractor-payment.mapper';

describe('subcontractor-payment mapper', () => {
  const makeInput = (paymentDate: Date | null) => ({
    id: 'sp-1',
    serviceDate: new Date('2024-05-01T00:00:00.000Z'),
    paymentDate,
    amount: new Prisma.Decimal('1000'),
    subcontractor: { id: 'sub-1', name: 'Sub 1' },
  });

  describe('toSubcontractorPaymentResponse', () => {
    it('should serialize null paymentDate as null', () => {
      const result = toSubcontractorPaymentResponse(makeInput(null));
      expect(result.paymentDate).toBeNull();
    });

    it('should serialize paymentDate as ISO string when not null', () => {
      const paymentDate = new Date('2024-05-15T00:00:00.000Z');

      const result = toSubcontractorPaymentResponse(makeInput(paymentDate));
      expect(result.paymentDate).toBe(paymentDate.toISOString());
    });

    it('should convert amount Decimal to number', () => {
      const result = toSubcontractorPaymentResponse(makeInput(null));
      expect(result.amount).toBe(1000);
    });

    it('should convert serviceDate to ISO string', () => {
      const result = toSubcontractorPaymentResponse(makeInput(null));
      expect(result.serviceDate).toBe('2024-05-01T00:00:00.000Z');
    });
  });
});
