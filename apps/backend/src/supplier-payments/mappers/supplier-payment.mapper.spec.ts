import { Prisma } from 'src/generated/client';
import { toSupplierPaymentResponseDto } from './supplier-payment.mapper';

describe('supplier-payment mapper', () => {
  const makeInput = (date: Date | null) => ({
    id: 'cp-1',
    amount: new Prisma.Decimal('1000'),
    date,
    description: null,
    isFuture: false,
    vatPercentage: null,
    projectReport: {
      id: 'report-1',
      projectId: 'project-1',
      project: { id: 'project-1', name: 'Project 1' },
    },
    supplier: { id: 'corp-1', name: 'Corp 1' },
  });

  describe('toSupplierPaymentResponseDto', () => {
    it('should serialize null date as null', () => {
      const result = toSupplierPaymentResponseDto(makeInput(null));
      expect(result.date).toBeNull();
    });

    it('should serialize a Date as ISO string', () => {
      const date = new Date('2024-05-10T00:00:00.000Z');

      const result = toSupplierPaymentResponseDto(makeInput(date));
      expect(result.date).toBe(date.toISOString());
    });

    it('should include all expected DTO fields', () => {
      const date = new Date('2024-05-10T00:00:00.000Z');

      const result = toSupplierPaymentResponseDto(makeInput(date));
      expect(result).toEqual({
        id: 'cp-1',
        amount: 1000,
        date: date.toISOString(),
        description: null,
        isFuture: false,
        vatPercentage: null,
        vatAmount: 0,
        effectiveTotal: 1000,
        projectReport: {
          id: 'report-1',
          projectId: 'project-1',
          projectName: 'Project 1',
        },
        supplier: { id: 'corp-1', name: 'Corp 1' },
      });
    });
  });
});
