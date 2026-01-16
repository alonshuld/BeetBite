import { Test, TestingModule } from '@nestjs/testing';
import { IncomesController } from './incomes.controller';
import { IncomesService } from './incomes.service';

describe('IncomesController', () => {
  let controller: IncomesController;

  const mockIncomesService = {
    getMonthIncome: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IncomesController],
      providers: [
        {
          provide: IncomesService,
          useValue: mockIncomesService,
        },
      ],
    }).compile();

    controller = module.get<IncomesController>(IncomesController);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMonthIncome', () => {
    it('should get the income for a specific month and year', async () => {
      const expectedResult = {
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
      };

      const month = { month: '2024-05-01T00:00:00.000Z' };

      mockIncomesService.getMonthIncome.mockResolvedValue(expectedResult);

      const result = await controller.getMonthIncome(month);

      expect(result).toEqual(expectedResult);
      expect(mockIncomesService.getMonthIncome).toHaveBeenCalledWith(month);
    });
  });
});
