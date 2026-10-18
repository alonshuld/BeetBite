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
      profitMargin?: number | null;
      incomeIncludesVat?: boolean;
      incomeEntries?: {
        id?: string;
        amount: number;
        incomeDate?: Date | null;
        tag?: string | null;
      }[];
      payments?: { id: string; amount: number; paymentDate: Date }[];
    } = {},
  ) => {
    const id = overrides.id ?? 'report-1';
    return {
      id,
      date: new Date('2024-05-01'),
      projectId: overrides.projectId ?? 'project-1',
      incomeIncludesVat: overrides.incomeIncludesVat ?? false,
      project: {
        name: overrides.name ?? 'Project 1',
        requesterName: overrides.requesterName ?? 'Dana',
        client: overrides.client ?? { id: 'client-1', name: 'Client A' },
      },
      profitMargin:
        overrides.profitMargin === null
          ? null
          : decimal(overrides.profitMargin ?? 10),
      incomeEntries: (overrides.incomeEntries ?? []).map((e, i) => ({
        id: e.id ?? `entry-${i + 1}`,
        amount: decimal(e.amount),
        incomeDate: e.incomeDate ?? null,
        tag: e.tag ?? null,
      })),
      clientPayments: (overrides.payments ?? []).map((p) => ({
        id: p.id,
        projectReportId: id,
        amount: decimal(p.amount),
        paymentDate: p.paymentDate,
      })),
    };
  };

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

    it('should compute received/pending income from client payments and profit from margin', async () => {
      mockPrismaService.projectReport.findMany.mockResolvedValue([
        report({
          incomeEntries: [
            {
              id: 'entry-1',
              amount: 6000,
              incomeDate: new Date('2024-05-10'),
              tag: 'שלד',
            },
            { id: 'entry-2', amount: 4000 },
          ],
          payments: [
            {
              id: 'payment-1',
              amount: 2500,
              paymentDate: new Date('2024-05-03'),
            },
            {
              id: 'payment-2',
              amount: 1000,
              paymentDate: new Date('2024-05-20'),
            },
          ],
        }),
      ]);

      const result = await service.getMonthlyIncome('2024-05-01T00:00:00.000Z');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        clientId: 'client-1',
        clientName: 'Client A',
        totalIncome: 10000,
        totalVat: 0,
        totalWithVat: 10000,
        totalReceived: 3500,
        totalProfit: 1000, // 10000 * 10%
      });
      expect(result[0].projects).toEqual([
        {
          reportId: 'report-1',
          projectId: 'project-1',
          projectName: 'Project 1',
          requesterName: 'Dana',
          totalIncome: 10000,
          incomeIncludesVat: false,
          vatPercentage: null,
          vatAmount: 0,
          totalWithVat: 10000,
          // The payments decide it — entry-1's received date does not.
          receivedIncome: 3500,
          pendingIncome: 6500,
          profit: 1000,
          incomeEntries: [
            {
              id: 'entry-1',
              amount: 6000,
              incomeDate: '2024-05-10T00:00:00.000Z',
              tag: 'שלד',
            },
            { id: 'entry-2', amount: 4000, incomeDate: null, tag: null },
          ],
          payments: [
            {
              id: 'payment-1',
              projectReportId: 'report-1',
              amount: 2500,
              paymentDate: '2024-05-03T00:00:00.000Z',
            },
            {
              id: 'payment-2',
              projectReportId: 'report-1',
              amount: 1000,
              paymentDate: '2024-05-20T00:00:00.000Z',
            },
          ],
        },
      ]);
    });

    it("should add the month's VAT on top of the income when the report carries it", async () => {
      mockPrismaService.projectReport.findMany.mockResolvedValue([
        report({
          incomeIncludesVat: true,
          incomeEntries: [{ amount: 1000 }],
          payments: [
            { id: 'p', amount: 170, paymentDate: new Date('2024-05-03') },
          ],
        }),
      ]);

      const result = await service.getMonthlyIncome('2024-05-01T00:00:00.000Z');

      expect(result[0].projects[0]).toMatchObject({
        totalIncome: 1000,
        incomeIncludesVat: true,
        vatPercentage: 17,
        vatAmount: 170,
        totalWithVat: 1170,
        receivedIncome: 170,
        pendingIncome: 1000,
        // Profit stays on the income without VAT.
        profit: 100,
      });
      expect(result[0]).toMatchObject({ totalVat: 170, totalWithVat: 1170 });
    });

    it('should add no VAT when the month has no rate configured yet', async () => {
      mockVatRatesService.findAllEntries.mockResolvedValue([]);
      mockPrismaService.projectReport.findMany.mockResolvedValue([
        report({ incomeIncludesVat: true, incomeEntries: [{ amount: 1000 }] }),
      ]);

      const result = await service.getMonthlyIncome('2024-05-01T00:00:00.000Z');

      expect(result[0].projects[0]).toMatchObject({
        incomeIncludesVat: true,
        vatPercentage: null,
        vatAmount: 0,
        totalWithVat: 1000,
      });
    });

    it('should never report a negative pending amount', async () => {
      // Income lowered after the client already paid more.
      mockPrismaService.projectReport.findMany.mockResolvedValue([
        report({
          incomeEntries: [{ amount: 500 }],
          payments: [
            { id: 'p', amount: 800, paymentDate: new Date('2024-05-03') },
          ],
        }),
      ]);

      const result = await service.getMonthlyIncome('2024-05-01T00:00:00.000Z');

      expect(result[0].projects[0].pendingIncome).toBe(0);
    });

    it('should group multiple projects under the same client and sum client totals', async () => {
      mockPrismaService.projectReport.findMany.mockResolvedValue([
        report({
          id: 'report-1',
          incomeEntries: [{ amount: 5000 }],
          payments: [
            { id: 'p1', amount: 5000, paymentDate: new Date('2024-05-10') },
          ],
        }),
        report({
          id: 'report-2',
          projectId: 'project-2',
          name: 'Project 2',
          profitMargin: 20,
          incomeIncludesVat: true,
          incomeEntries: [{ amount: 2000 }],
        }),
      ]);

      const result = await service.getMonthlyIncome('2024-05-01T00:00:00.000Z');

      expect(result).toHaveLength(1);
      const client = result[0];
      expect(client.projects).toHaveLength(2);
      expect(client.totalIncome).toBe(7000); // 5000 + 2000
      expect(client.totalVat).toBe(340); // VAT on project 2 only
      expect(client.totalWithVat).toBe(7340);
      expect(client.totalReceived).toBe(5000);
      expect(client.totalProfit).toBe(900); // 500 + 400
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

    it('should treat a report with no income entries as zero income and zero profit', async () => {
      mockPrismaService.projectReport.findMany.mockResolvedValue([
        report({ profitMargin: 15 }),
      ]);

      const result = await service.getMonthlyIncome('2024-05-01T00:00:00.000Z');

      expect(result[0].projects[0]).toMatchObject({
        totalIncome: 0,
        receivedIncome: 0,
        pendingIncome: 0,
        profit: 0,
      });
      expect(result[0].totalIncome).toBe(0);
      expect(result[0].totalProfit).toBe(0);
    });

    it('should treat all income as pending when the client has paid nothing', async () => {
      mockPrismaService.projectReport.findMany.mockResolvedValue([
        report({
          incomeEntries: [
            // A received date alone no longer counts as payment.
            { amount: 2500, incomeDate: new Date('2024-05-10') },
            { amount: 1500 },
          ],
        }),
      ]);

      const result = await service.getMonthlyIncome('2024-05-01T00:00:00.000Z');

      expect(result[0].projects[0]).toMatchObject({
        totalIncome: 4000,
        receivedIncome: 0,
        pendingIncome: 4000,
        payments: [],
      });
    });

    it('should default profit to zero when profitMargin is null', async () => {
      mockPrismaService.projectReport.findMany.mockResolvedValue([
        report({ profitMargin: null, incomeEntries: [{ amount: 1000 }] }),
      ]);

      const result = await service.getMonthlyIncome('2024-05-01T00:00:00.000Z');

      expect(result[0].projects[0].profit).toBe(0);
      expect(result[0].totalProfit).toBe(0);
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
