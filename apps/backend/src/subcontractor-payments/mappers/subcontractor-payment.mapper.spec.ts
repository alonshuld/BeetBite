import { Prisma } from 'src/generated/client';
import { toSubcontractorPaymentResponse } from './subcontractor-payment.mapper';

describe('subcontractor-payment mapper', () => {
  const makeInput = () => ({
    id: 'sp-1',
    projectId: 'project-1',
    serviceDate: new Date('2024-05-01T00:00:00.000Z'),
    amount: new Prisma.Decimal('1000'),
    isPaid: false,
    paymentDate: null,
    description: null as string | null,
    subcontractor: { id: 'sub-1', name: 'Sub 1' },
  });

  describe('toSubcontractorPaymentResponse', () => {
    it('should convert amount Decimal to number', () => {
      const result = toSubcontractorPaymentResponse(makeInput());
      expect(result.amount).toBe(1000);
    });

    it('should convert serviceDate to ISO string', () => {
      const result = toSubcontractorPaymentResponse(makeInput());
      expect(result.serviceDate).toBe('2024-05-01T00:00:00.000Z');
    });

    it('should include projectId', () => {
      const result = toSubcontractorPaymentResponse(makeInput());
      expect(result.projectId).toBe('project-1');
    });

    // serviceDate says which month is being settled; paymentDate says when the
    // money actually moved. Conflating them is the failure mode this guards.
    it('should convert paymentDate to an ISO string when set', () => {
      const result = toSubcontractorPaymentResponse({
        ...makeInput(),
        paymentDate: new Date('2024-05-17T00:00:00.000Z'),
      });
      expect(result.paymentDate).toBe('2024-05-17T00:00:00.000Z');
      expect(result.serviceDate).toBe('2024-05-01T00:00:00.000Z');
    });

    it('should map a missing paymentDate to null, not undefined', () => {
      const result = toSubcontractorPaymentResponse(makeInput());
      expect(result.paymentDate).toBeNull();
    });

    it('should pass the description through', () => {
      const result = toSubcontractorPaymentResponse({
        ...makeInput(),
        description: 'Cheque #1042',
      });
      expect(result.description).toBe('Cheque #1042');
    });

    it('should keep a missing description as null', () => {
      const result = toSubcontractorPaymentResponse(makeInput());
      expect(result.description).toBeNull();
    });
  });
});
