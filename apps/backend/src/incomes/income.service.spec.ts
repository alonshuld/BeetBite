// import { Test, TestingModule } from '@nestjs/testing';
// import { IncomesService } from './incomes.service';
// import { PrismaService } from 'src/prisma/prisma.service';
// import { MonthQueryDto } from '../common/month-query.dto';
// import { IncomeResponseDto } from './dto/income-response.dto';

// describe('IncomesService', () => {
//   let service: IncomesService;
//   let prismaService: jest.Mocked<PrismaService>;

//   beforeEach(async () => {
//     const mockPrismaService = {
//       projectReport: {
//         findMany: jest.fn(),
//       },
//     };

//     const module: TestingModule = await Test.createTestingModule({
//       providers: [
//         IncomesService,
//         {
//           provide: PrismaService,
//           useValue: mockPrismaService,
//         },
//       ],
//     }).compile();

//     service = module.get<IncomesService>(IncomesService);
//     prismaService = module.get(PrismaService);
//   });

//   it('should be defined', () => {
//     expect(service).toBeDefined();
//   });

//   describe('getTotalIncome', () => {
//     it('should return total income and project incomes for a valid date', async () => {
//       const date: MonthQueryDto = { month: '2024-06-15T00:00:00.000Z' };
//       const mockProjectReports = [
//         {
//           date: new Date(date.month),
//           income: 100000,
//           profitMargin: 10,
//           projectId: 'proj-1',
//           project: { name: 'Project A' },
//         },
//         {
//           date: new Date(date.month),
//           income: 200000,
//           profitMargin: 15,
//           projectId: 'proj-2',
//           project: { name: 'Project B' },
//         },
//       ];

//       prismaService.projectReport.findMany.mockResolvedValue(
//         mockProjectReports,
//       );

//       const result: IncomeResponseDto = await service.getTotalIncome(date);

//       expect(prismaService.projectReport.findMany).toHaveBeenCalledWith({
//         where: {
//           date: new Date(date.month),
//         },
//         include: {
//           project: true,
//         },
//       });

//       expect(result.totalIncome).toBe(300000);
//       expect(result.totalProfit).toBe(10000 + 30000); // 10% of 100k + 15% of 200k
//       expect(result.projectIncomes).toHaveLength(2);
//       expect(result.projectIncomes[0]).toEqual({
//         projectId: 'proj-1',
//         projectName: 'Project A',
//         income: 100000,
//         profitMargin: 10,
//         profit: 10000,
//       });
//     });

//     it('should return zero totals when no project reports exist', async () => {
//       const date: MonthQueryDto = { month: '2024-06-15T00:00:00.000Z' };

//       prismaService.projectReport.findMany.mockResolvedValue([]);

//       const result: IncomeResponseDto = await service.getTotalIncome(date);

//       expect(result.totalIncome).toBe(0);
//       expect(result.totalProfit).toBe(0);
//       expect(result.projectIncomes).toEqual([]);
//     });

//     it('should handle invalid date string gracefully', async () => {
//       const date: MonthQueryDto = { month: 'invalid-date' };

//       // Since new Date('invalid-date') creates an invalid date, but the query might still run
//       // Depending on Prisma, it might throw or return empty
//       // For this test, assume it throws or we can mock it
//       prismaService.projectReport.findMany.mockRejectedValue(
//         new Error('Invalid date'),
//       );

//       await expect(service.getTotalIncome(date)).rejects.toThrow(
//         'Invalid date',
//       );
//     });
//   });
// });
