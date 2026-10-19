import { Prisma } from 'src/generated/client';
import {
  toProjectReportListItem,
  toProjectReportResponse,
} from './project-reports.mapper';

describe('project-reports mapper', () => {
  const incomeEntries = [
    {
      id: 'entry-1',
      amount: new Prisma.Decimal('10000'),
      incomeDate: null,
      tag: 'שלד',
    },
  ];

  const makeListItemInput = () => ({
    id: 'report-1',
    projectId: 'project-1',
    subcontractorId: 'sub-1',
    date: new Date('2024-05-01T00:00:00.000Z'),
    profitMargin: new Prisma.Decimal('10'),
    initiatorIncome: null as Prisma.Decimal | null,
    vatPaidAt: null as Date | null,
    project: {
      id: 'project-1',
      name: 'Project 1',
      description: 'A project',
      location: '123 Main St, Tel Aviv',
      requesterName: 'Jane Doe',
      initiatorName: null,
      client: { id: 'client-1', name: 'Client 1' },
    },
    subcontractor: { id: 'sub-1', name: 'Sub 1' },
    incomeEntries,
    supplierPayments: [] as {
      id: string;
      amount: Prisma.Decimal;
      includesVat: boolean;
      supplier: { id: string; name: string };
    }[],
  });

  const makeResponseInput = () => ({
    ...makeListItemInput(),
    project: {
      id: 'project-1',
      name: 'Project 1',
      description: 'A project',
      location: '123 Main St, Tel Aviv',
      requesterName: 'Jane Doe',
      initiatorName: null,
    },
    subcontractor: {
      id: 'sub-1',
      name: 'Sub 1',
      payments: [] as { id: string }[],
    },
    supplierPayments: [] as {
      id: string;
      amount: Prisma.Decimal;
      includesVat: boolean;
      supplier: { id: string; name: string };
    }[],
    incomeEntries,
  });

  describe('toProjectReportListItem — FK leak prevention', () => {
    it('should not include projectId in the response', () => {
      const result = toProjectReportListItem(makeListItemInput(), []);
      expect(result).not.toHaveProperty('projectId');
    });

    it('should not include subcontractorId in the response', () => {
      const result = toProjectReportListItem(makeListItemInput(), []);
      expect(result).not.toHaveProperty('subcontractorId');
    });

    it('should include all expected DTO fields', () => {
      const result = toProjectReportListItem(makeListItemInput(), []);
      expect(result).toEqual({
        id: 'report-1',
        project: {
          id: 'project-1',
          name: 'Project 1',
          description: 'A project',
          location: '123 Main St, Tel Aviv',
          requesterName: 'Jane Doe',
          initiatorName: null,
          client: { id: 'client-1', name: 'Client 1' },
        },
        subcontractor: { id: 'sub-1', name: 'Sub 1' },
        date: '2024-05-01T00:00:00.000Z',
        profitMargin: 10,
        totalIncome: 10000,
        incomeEntries: [
          { id: 'entry-1', amount: 10000, incomeDate: null, tag: 'שלד' },
        ],
        supplierPayments: [],
        initiatorIncome: null,
      });
    });

    it('converts a set initiatorIncome to a number', () => {
      const result = toProjectReportListItem(
        {
          ...makeListItemInput(),
          initiatorIncome: new Prisma.Decimal('120000'),
        },
        [],
      );
      expect(result.initiatorIncome).toBe(120000);
    });
  });

  describe('toProjectReportListItem — supplier payment VAT', () => {
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
    const supplier = { id: 'supplier-1', name: 'Supplier 1' };

    it("derives VAT from the rate for the report's own month", () => {
      const input = makeListItemInput();
      input.supplierPayments = [
        {
          id: 'payment-1',
          amount: new Prisma.Decimal('1000'),
          includesVat: true,
          supplier,
        },
      ];

      const [payment] = toProjectReportListItem(input, rates).supplierPayments;

      expect(payment).toEqual({
        id: 'payment-1',
        amount: 1000,
        includesVat: true,
        vatPercentage: 18,
        vatAmount: 180,
        effectiveTotal: 1180,
        supplier,
      });
    });

    it('adds no VAT to a payment that does not include it', () => {
      const input = makeListItemInput();
      input.supplierPayments = [
        {
          id: 'payment-1',
          amount: new Prisma.Decimal('1000'),
          includesVat: false,
          supplier,
        },
      ];

      const [payment] = toProjectReportListItem(input, rates).supplierPayments;

      expect(payment).toMatchObject({
        includesVat: false,
        vatPercentage: null,
        vatAmount: 0,
        effectiveTotal: 1000,
      });
    });
  });

  describe('toProjectReportResponse — FK leak prevention', () => {
    it('should not include projectId in the response', () => {
      const result = toProjectReportResponse(makeResponseInput(), 1000, 8000);
      expect(result).not.toHaveProperty('projectId');
    });

    it('should not include subcontractorId in the response', () => {
      const result = toProjectReportResponse(makeResponseInput(), 1000, 8000);
      expect(result).not.toHaveProperty('subcontractorId');
    });

    it('should include all expected DTO fields', () => {
      const result = toProjectReportResponse(makeResponseInput(), 1000, 8000);
      expect(result).toEqual({
        id: 'report-1',
        project: {
          id: 'project-1',
          name: 'Project 1',
          description: 'A project',
          location: '123 Main St, Tel Aviv',
          requesterName: 'Jane Doe',
          initiatorName: null,
        },
        date: '2024-05-01T00:00:00.000Z',
        profitMargin: 10,
        profit: 1000,
        totalIncome: 10000,
        incomeEntries: [
          { id: 'entry-1', amount: 10000, incomeDate: null, tag: 'שלד' },
        ],
        subcontractor: {
          id: 'sub-1',
          name: 'Sub 1',
          payment: 8000,
        },
        supplierPayments: [],
        initiatorIncome: null,
      });
    });
  });
});
