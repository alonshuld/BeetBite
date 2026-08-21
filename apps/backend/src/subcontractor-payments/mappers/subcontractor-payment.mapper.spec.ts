import { Prisma } from 'src/generated/client';
import { toSubcontractorPaymentResponse } from './subcontractor-payment.mapper';

describe('subcontractor-payment mapper', () => {
  const makeInput = (tag: string | null = null) => ({
    id: 'sp-1',
    projectId: 'project-1',
    serviceDate: new Date('2024-05-01T00:00:00.000Z'),
    amount: new Prisma.Decimal('1000'),
    isPaid: false,
    tag,
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

    it('should include the tag', () => {
      const result = toSubcontractorPaymentResponse(makeInput('Materials'));
      expect(result.tag).toBe('Materials');
    });

    it('should map a missing tag as null', () => {
      const result = toSubcontractorPaymentResponse(makeInput());
      expect(result.tag).toBeNull();
    });
  });
});
