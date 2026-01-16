import { Test, TestingModule } from '@nestjs/testing';
import { IncomesService } from './incomes.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { MonthQueryDto } from '../common/month-query.dto';
import { IncomeResponseDto } from './dto/income-response.dto';

describe('IncomesService', () => {
  let service: IncomesService;

  const mockPrismaService = {
    projectReport: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IncomesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<IncomesService>(IncomesService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMonthIncome', () => {
    const monthQueryDto: MonthQueryDto = { month: '2024-05-01T00:00:00.000Z' };

    it('should return total income', async () => {
      const mockProjectReports = [
        {
          id: '1',
          projectId: 'p1',
          clientId: 'c1',
          date: new Date('2024-05-01T00:00:00.000Z'),
          // Mock the Decimal object behavior
          income: { toNumber: () => 1000.0 },
          profitMargin: { toNumber: () => 5.5 },
          project: { id: 'p1', name: 'Project 1' },
        },
        {
          id: '2',
          projectId: 'p2',
          clientId: 'c2',
          date: new Date('2024-05-01T00:00:00.000Z'),
          income: { toNumber: () => 2000.0 },
          profitMargin: { toNumber: () => 7.5 },
          project: { id: 'p2', name: 'Project 2' },
        },
      ];

      mockPrismaService.projectReport.findMany.mockResolvedValue(
        mockProjectReports,
      );

      const result: IncomeResponseDto =
        await service.getMonthIncome(monthQueryDto);

      expect(result).toEqual({
        totalIncome: 3000,
        totalProfit: 205,
        projectIncomes: [
          {
            projectId: 'p1',
            projectName: 'Project 1',
            income: 1000,
            profit: 55,
            profitMargin: 5.5,
          },
          {
            projectId: 'p2',
            projectName: 'Project 2',
            income: 2000,
            profit: 150,
            profitMargin: 7.5,
          },
        ],
      });

      expect(mockPrismaService.projectReport.findMany).toHaveBeenCalledWith({
        where: { date: new Date('2024-05-01T00:00:00.000Z') },
        include: { project: true },
      });
    });

    it('should return zero income when no reports found', async () => {
      mockPrismaService.projectReport.findMany.mockResolvedValue([]);

      const result: IncomeResponseDto =
        await service.getMonthIncome(monthQueryDto);

      expect(result).toEqual({
        totalIncome: 0,
        totalProfit: 0,
        projectIncomes: [],
      });

      expect(mockPrismaService.projectReport.findMany).toHaveBeenCalledWith({
        where: { date: new Date('2024-05-01T00:00:00.000Z') },
        include: { project: true },
      });
    });
  });
});
