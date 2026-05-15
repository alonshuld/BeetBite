import { Prisma } from 'src/generated/client';
import {
  toProjectReportListItem,
  toProjectReportResponse,
} from './project-reports.mapper';

describe('project-reports mapper', () => {
  const makeListItemInput = () => ({
    id: 'report-1',
    projectId: 'project-1',
    subcontractorId: 'sub-1',
    date: new Date('2024-05-01T00:00:00.000Z'),
    profitMargin: new Prisma.Decimal('10'),
    income: new Prisma.Decimal('10000'),
    incomeDate: null,
    project: { id: 'project-1', name: 'Project 1' },
    subcontractor: { id: 'sub-1', name: 'Sub 1' },
  });

  const makeResponseInput = () => ({
    ...makeListItemInput(),
    subcontractor: {
      id: 'sub-1',
      name: 'Sub 1',
      payments: [] as { paymentDate: Date | null }[],
    },
    corporationPayments: [] as {
      id: string;
      amount: Prisma.Decimal;
      corporation: { id: string; name: string };
    }[],
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
        project: { id: 'project-1', name: 'Project 1' },
        subcontractor: { id: 'sub-1', name: 'Sub 1' },
        date: '2024-05-01T00:00:00.000Z',
        profitMargin: 10,
        income: 10000,
        incomeDate: undefined,
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
        project: { id: 'project-1', name: 'Project 1' },
        date: '2024-05-01T00:00:00.000Z',
        profitMargin: 10,
        profit: 1000,
        income: 10000,
        incomeDate: undefined,
        subcontractor: {
          id: 'sub-1',
          name: 'Sub 1',
          payment: 8000,
          paymentDate: undefined,
        },
        corporationPayments: [],
      });
    });
  });
});
