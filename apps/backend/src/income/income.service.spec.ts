import { Test, TestingModule } from '@nestjs/testing';
import { IncomeService } from './income.service';
import { ProjectClientAssignmentsService } from '../project-client-assignments/project-client-assignments.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('IncomeService', () => {
  let service: IncomeService;

  const mockPrismaService = {
    projectReport: {
      findMany: jest.fn(),
    },
  };

  /** Builds a Decimal-like stub mirroring Prisma.Decimal's toNumber(). */
  const decimal = (value: number) => ({ toNumber: () => value });

  // Resolution is exercised by project-client-assignments.service.spec.ts.
  // An empty map here makes the read paths fall back to the project's cached
  // client, which is the behaviour every assertion below was written against.
  const mockAssignmentsService = {
    resolveClientsForMonth: jest.fn().mockResolvedValue(new Map()),
    createInitialAssignment: jest.fn().mockResolvedValue(undefined),
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
      ],
    }).compile();

    service = module.get<IncomeService>(IncomeService);
    jest.clearAllMocks();
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

    it('should compute received/pending income from incomeDate and profit from margin', async () => {
      mockPrismaService.projectReport.findMany.mockResolvedValue([
        {
          projectId: 'project-1',
          project: {
            name: 'Project 1',
            client: { id: 'client-1', name: 'Client A' },
          },
          profitMargin: decimal(10),
          incomeEntries: [
            { amount: decimal(6000), incomeDate: new Date('2024-05-10') },
            { amount: decimal(4000), incomeDate: null },
          ],
        },
      ]);

      const result = await service.getMonthlyIncome('2024-05-01T00:00:00.000Z');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        clientId: 'client-1',
        clientName: 'Client A',
        totalIncome: 10000,
        totalProfit: 1000, // 10000 * 10%
      });
      expect(result[0].projects).toEqual([
        {
          projectId: 'project-1',
          projectName: 'Project 1',
          totalIncome: 10000,
          receivedIncome: 6000, // only the entry with a non-null incomeDate
          pendingIncome: 4000, // total - received
          profit: 1000,
        },
      ]);
    });

    it('should group multiple projects under the same client and sum client totals', async () => {
      mockPrismaService.projectReport.findMany.mockResolvedValue([
        {
          projectId: 'project-1',
          project: {
            name: 'Project 1',
            client: { id: 'client-1', name: 'Client A' },
          },
          profitMargin: decimal(10),
          incomeEntries: [
            { amount: decimal(5000), incomeDate: new Date('2024-05-10') },
          ],
        },
        {
          projectId: 'project-2',
          project: {
            name: 'Project 2',
            client: { id: 'client-1', name: 'Client A' },
          },
          profitMargin: decimal(20),
          incomeEntries: [{ amount: decimal(2000), incomeDate: null }],
        },
      ]);

      const result = await service.getMonthlyIncome('2024-05-01T00:00:00.000Z');

      expect(result).toHaveLength(1);
      const client = result[0];
      expect(client.projects).toHaveLength(2);
      expect(client.totalIncome).toBe(7000); // 5000 + 2000
      expect(client.totalProfit).toBe(900); // 500 + 400
    });

    it('should keep different clients in separate entries', async () => {
      mockPrismaService.projectReport.findMany.mockResolvedValue([
        {
          projectId: 'project-1',
          project: {
            name: 'Project 1',
            client: { id: 'client-1', name: 'Client A' },
          },
          profitMargin: decimal(10),
          incomeEntries: [
            { amount: decimal(1000), incomeDate: new Date('2024-05-10') },
          ],
        },
        {
          projectId: 'project-2',
          project: {
            name: 'Project 2',
            client: { id: 'client-2', name: 'Client B' },
          },
          profitMargin: decimal(10),
          incomeEntries: [
            { amount: decimal(3000), incomeDate: new Date('2024-05-12') },
          ],
        },
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
        {
          projectId: 'project-1',
          project: {
            name: 'Project 1',
            client: { id: 'client-1', name: 'Client A' },
          },
          profitMargin: decimal(15),
          incomeEntries: [],
        },
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

    it('should treat all income as pending when no entry has an incomeDate', async () => {
      mockPrismaService.projectReport.findMany.mockResolvedValue([
        {
          projectId: 'project-1',
          project: {
            name: 'Project 1',
            client: { id: 'client-1', name: 'Client A' },
          },
          profitMargin: decimal(10),
          incomeEntries: [
            { amount: decimal(2500), incomeDate: null },
            { amount: decimal(1500), incomeDate: null },
          ],
        },
      ]);

      const result = await service.getMonthlyIncome('2024-05-01T00:00:00.000Z');

      expect(result[0].projects[0]).toMatchObject({
        totalIncome: 4000,
        receivedIncome: 0,
        pendingIncome: 4000,
      });
    });

    it('should default profit to zero when profitMargin is null', async () => {
      mockPrismaService.projectReport.findMany.mockResolvedValue([
        {
          projectId: 'project-1',
          project: {
            name: 'Project 1',
            client: { id: 'client-1', name: 'Client A' },
          },
          profitMargin: null,
          incomeEntries: [
            { amount: decimal(1000), incomeDate: new Date('2024-05-10') },
          ],
        },
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
