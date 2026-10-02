import { Prisma } from 'src/generated/client';
import { toSupplierPaymentResponseDto } from './supplier-payment.mapper';

describe('supplier-payment mapper', () => {
  const makeInput = (date: Date | null, includesVat = false) => ({
    id: 'cp-1',
    amount: new Prisma.Decimal('1000'),
    date,
    description: null,
    isFuture: false,
    includesVat,
    projectReport: {
      id: 'report-1',
      projectId: 'project-1',
      date: new Date('2024-05-01T00:00:00.000Z'),
      project: { id: 'project-1', name: 'Project 1' },
    },
    supplier: { id: 'corp-1', name: 'Corp 1' },
  });

  describe('toSupplierPaymentResponseDto', () => {
    it('should serialize null date as null', () => {
      const result = toSupplierPaymentResponseDto(makeInput(null), []);
      expect(result.date).toBeNull();
    });

    it('should serialize a Date as ISO string', () => {
      const date = new Date('2024-05-10T00:00:00.000Z');

      const result = toSupplierPaymentResponseDto(makeInput(date), []);
      expect(result.date).toBe(date.toISOString());
    });

    it('should include all expected DTO fields', () => {
      const date = new Date('2024-05-10T00:00:00.000Z');

      const result = toSupplierPaymentResponseDto(makeInput(date), []);
      expect(result).toEqual({
        id: 'cp-1',
        amount: 1000,
        date: date.toISOString(),
        description: null,
        isFuture: false,
        includesVat: false,
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

    describe('VAT', () => {
      const date = new Date('2024-05-10T00:00:00.000Z');
      const rates = [
        {
          effectiveMonth: new Date('2024-01-01T00:00:00.000Z'),
          percentage: new Prisma.Decimal('17'),
        },
        {
          effectiveMonth: new Date('2024-05-01T00:00:00.000Z'),
          percentage: new Prisma.Decimal('18'),
        },
      ];

      it("derives the percentage from the rate for the report's month", () => {
        const result = toSupplierPaymentResponseDto(
          makeInput(date, true),
          rates,
        );

        expect(result).toMatchObject({
          includesVat: true,
          vatPercentage: 18,
          vatAmount: 180,
          effectiveTotal: 1180,
        });
      });

      it('adds no VAT when the payment does not include it', () => {
        const result = toSupplierPaymentResponseDto(
          makeInput(date, false),
          rates,
        );

        expect(result).toMatchObject({
          includesVat: false,
          vatPercentage: null,
          vatAmount: 0,
          effectiveTotal: 1000,
        });
      });

      it('keeps the choice but adds no VAT when no rate is configured', () => {
        const result = toSupplierPaymentResponseDto(makeInput(date, true), []);

        expect(result).toMatchObject({
          includesVat: true,
          vatPercentage: null,
          vatAmount: 0,
          effectiveTotal: 1000,
        });
      });
    });
  });
});
