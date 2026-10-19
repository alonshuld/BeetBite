import { Test, TestingModule } from '@nestjs/testing';
import { IncomeService } from './income.service';
import { ProjectClientAssignmentsService } from '../project-client-assignments/project-client-assignments.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { VatRatesService } from 'src/vat-rates/vat-rates.service';

describe('IncomeService', () => {
  let service: IncomeService;

  const mockPrismaService = {
    projectReport: {
      findMany: vi.fn(),
    },
  };

  /** Builds a Decimal-like stub mirroring Prisma.Decimal's toNumber(). */
  const decimal = (value: number) => ({ toNumber: () => value });

  // Resolution is exercised by project-client-assignments.service.spec.ts.
  // An empty map here makes the read paths fall back to the project's cached
  // client, which is the behaviour every assertion below was written against.
  const mockAssignmentsService = {
    resolveClientsForMonth: vi.fn().mockResolvedValue(new Map()),
    createInitialAssignment: vi.fn().mockResolvedValue(undefined),
  };

  const mockVatRatesService = { findAllEntries: vi.fn() };

  /** One report row as the service selects it, with sensible defaults. */
  const report = (
    overrides: {
      id?: string;
      projectId?: string;
      name?: string;
      requesterName?: string;
      client?: { id: string; name: string };
      vatPaidAt?: Date | null;
      payments?: { id: string; amount: number; paymentDate: Date }[];
      incomeEntries?: {
        id?: string;
        amount: number;
        incomeDate?: Date | null;
        tag?: string | null;
      }[];
    } = {},
  ) => ({
    id: overrides.id ?? 'report-1',
    date: new Date('2024-05-01'),
    projectId: overrides.projectId ?? 'project-1',
    vatPaidAt: overrides.vatPaidAt ?? null,
    project: {
      name: overrides.name ?? 'Project 1',
      requesterName: overrides.requesterName ?? 'Dana',
      client: overrides.client ?? { id: 'client-1', name: 'Client A' },
    },
    incomeEntries: (overrides.incomeEntries ?? []).map((e, i) => ({
      id: e.id ?? `entry-${i + 1}`,
      amount: decimal(e.amount),
      incomeDate: e.incomeDate ?? null,
      tag: e.tag ?? null,
    })),
    clientPayments: (overrides.payments ?? []).map((p) => ({
      id: p.id,
      projectReportId: overrides.id ?? 'report-1',
      amount: decimal(p.amount),
      paymentDate: p.paymentDate,
    })),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IncomeService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ProjectClientAssignmentsService,
          useValue: mockAssignmentsService,
        },
        { provide: VatRatesService, useValue: mockVatRatesService },
      ],
    }).compile();

    service = module.get<IncomeService>(IncomeService);
    vi.clearAllMocks();
    mockVatRatesService.findAllEntries.mockResolvedValue([
      { effectiveMonth: new Date('2024-01-01'), percentage: decimal(17) },
    ]);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMonthlyIncome', () => {
    it('should query project reports within the month boundaries [startOfMonth, startOfNextMonth)', async () => {
      mockPrismaService.projectReport.findMany.mockResolvedValue([]);

      await service.getMonthlyIncome('2024-05-15T12:34:56.000Z');

      expect(mockPrismaService.projectReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            date: {
              gte: new Date(Date.UTC(2024, 4, 1)),
              lt: new Date(Date.UTC(2024, 5, 1)),
            },
          },
        }),
      );
    });

    it("should add the month's VAT to every project and return what was paid", async () => {
      mockPrismaService.projectReport.findMany.mockResolvedValue([
        report({
          payments: [
            { id: 'pay-1', amount: 6000, paymentDate: new Date('2024-05-10') },
            { id: 'pay-2', amount: 1500, paymentDate: new Date('2024-05-20') },
          ],
          incomeEntries: [
            {
              id: 'entry-1',
              amount: 6000,
              incomeDate: new Date('2024-05-10'),
              tag: 'שלד',
            },
            { id: 'entry-2', amount: 4000 },
          ],
        }),
      ]);

      const result = await service.getMonthlyIncome('2024-05-01T00:00:00.000Z');

      expect(result).toEqual([
        {
          clientId: 'client-1',
          clientName: 'Client A',
          totalIncome: 10000,
          incomePaid: 7500,
          totalVat: 1700,
          vatPaid: 0,
          totalWithVat: 11700,
          projects: [
            {
              reportId: 'report-1',
              projectId: 'project-1',
              projectName: 'Project 1',
              requesterName: 'Dana',
              totalIncome: 10000,
              vatPercentage: 17,
              vatAmount: 1700,
              totalWithVat: 11700,
              incomePaid: 7500,
              payments: [
                {
                  id: 'pay-1',
                  projectReportId: 'report-1',
                  amount: 6000,
                  paymentDate: '2024-05-10T00:00:00.000Z',
                },
                {
                  id: 'pay-2',
                  projectReportId: 'report-1',
                  amount: 1500,
                  paymentDate: '2024-05-20T00:00:00.000Z',
                },
              ],
              vatPaidAt: null,
              incomeEntries: [
                {
                  id: 'entry-1',
                  amount: 6000,
                  incomeDate: '2024-05-10T00:00:00.000Z',
                  tag: 'שלד',
                },
                { id: 'entry-2', amount: 4000, incomeDate: null, tag: null },
              ],
            },
          ],
        },
      ]);
    });

    it('should add no VAT when the month has no rate configured yet', async () => {
      mockVatRatesService.findAllEntries.mockResolvedValue([]);
      mockPrismaService.projectReport.findMany.mockResolvedValue([
        report({ incomeEntries: [{ amount: 1000 }] }),
      ]);

      const result = await service.getMonthlyIncome('2024-05-01T00:00:00.000Z');

      expect(result[0].projects[0]).toMatchObject({
        vatPercentage: null,
        vatAmount: 0,
        totalWithVat: 1000,
      });
    });

    it('should count income and VAT as paid independently', async () => {
      mockPrismaService.projectReport.findMany.mockResolvedValue([
        // Income paid, VAT still owed.
        report({
          id: 'report-1',
          payments: [
            { id: 'p', amount: 5000, paymentDate: new Date('2024-05-10') },
          ],
          incomeEntries: [{ amount: 5000 }],
        }),
        // VAT paid on its own (e.g. a month later), income still owed.
        report({
          id: 'report-2',
          projectId: 'project-2',
          name: 'Project 2',
          vatPaidAt: new Date('2024-06-03'),
          incomeEntries: [{ amount: 2000 }],
        }),
      ]);

      const result = await service.getMonthlyIncome('2024-05-01T00:00:00.000Z');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        totalIncome: 7000,
        incomePaid: 5000,
        totalVat: 1190, // 17% of 7000
        vatPaid: 340, // 17% of 2000
        totalWithVat: 8190,
      });
    });

    it('should keep different clients in separate entries', async () => {
      mockPrismaService.projectReport.findMany.mockResolvedValue([
        report({ incomeEntries: [{ amount: 1000 }] }),
        report({
          id: 'report-2',
          projectId: 'project-2',
          name: 'Project 2',
          client: { id: 'client-2', name: 'Client B' },
          incomeEntries: [{ amount: 3000 }],
        }),
      ]);

      const result = await service.getMonthlyIncome('2024-05-01T00:00:00.000Z');

      expect(result).toHaveLength(2);
      expect(result.map((c) => c.clientId).sort()).toEqual([
        'client-1',
        'client-2',
      ]);
    });

    it('should return an empty array when there are no reports', async () => {
      mockPrismaService.projectReport.findMany.mockResolvedValue([]);

      const result = await service.getMonthlyIncome('2024-05-01T00:00:00.000Z');

      expect(result).toEqual([]);
    });

    it('should treat a report with no income entries as zero income', async () => {
      mockPrismaService.projectReport.findMany.mockResolvedValue([report()]);

      const result = await service.getMonthlyIncome('2024-05-01T00:00:00.000Z');

      expect(result[0].projects[0]).toMatchObject({
        totalIncome: 0,
        vatAmount: 0,
        totalWithVat: 0,
      });
    });

    it('should not count a received date on an income entry as paid', async () => {
      mockPrismaService.projectReport.findMany.mockResolvedValue([
        report({
          incomeEntries: [{ amount: 2500, incomeDate: new Date('2024-05-10') }],
        }),
      ]);

      const result = await service.getMonthlyIncome('2024-05-01T00:00:00.000Z');

      expect(result[0].incomePaid).toBe(0);
      expect(result[0].projects[0].payments).toEqual([]);
    });

    it('should handle a December reference month rolling over to the next year', async () => {
      mockPrismaService.projectReport.findMany.mockResolvedValue([]);

      await service.getMonthlyIncome('2024-12-31T23:59:59.000Z');

      expect(mockPrismaService.projectReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            date: {
              gte: new Date(Date.UTC(2024, 11, 1)),
              lt: new Date(Date.UTC(2025, 0, 1)),
            },
          },
        }),
      );
    });
  });
});
