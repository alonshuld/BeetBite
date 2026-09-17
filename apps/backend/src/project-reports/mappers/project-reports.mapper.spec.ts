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
    project: {
      id: 'project-1',
      name: 'Project 1',
      description: 'A project',
      location: '123 Main St, Tel Aviv',
      requesterName: 'Jane Doe',
      client: { id: 'client-1', name: 'Client 1' },
    },
    subcontractor: { id: 'sub-1', name: 'Sub 1' },
    incomeEntries,
    supplierPayments: [] as {
      id: string;
      amount: Prisma.Decimal;
      vatPercentage: Prisma.Decimal | null;
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
    },
    subcontractor: {
      id: 'sub-1',
      name: 'Sub 1',
      payments: [] as { id: string }[],
    },
    supplierPayments: [] as {
      id: string;
      amount: Prisma.Decimal;
      vatPercentage: Prisma.Decimal | null;
      supplier: { id: string; name: string };
    }[],
    incomeEntries,
  });

  describe('toProjectReportListItem — FK leak prevention', () => {
    it('should not include projectId in the response', () => {
      const result = toProjectReportListItem(makeListItemInput());
      expect(result).not.toHaveProperty('projectId');
    });

    it('should not include subcontractorId in the response', () => {
      const result = toProjectReportListItem(makeListItemInput());
      expect(result).not.toHaveProperty('subcontractorId');
    });

    it('should include all expected DTO fields', () => {
      const result = toProjectReportListItem(makeListItemInput());
      expect(result).toEqual({
        id: 'report-1',
        project: {
          id: 'project-1',
          name: 'Project 1',
          description: 'A project',
          location: '123 Main St, Tel Aviv',
          requesterName: 'Jane Doe',
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
      });
    });
  });
});
