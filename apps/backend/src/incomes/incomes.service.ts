import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { IncomeResponseDto } from './dto/income-response.dto';
import { MonthQueryDto } from 'src/common/month-query.dto';
import { projectReportToProjectIncome } from './mappers/project-report-to-project-income.mapper';
import { MonthlyIncomeDto } from './dto/monthly-income.dto';
import { MonthIncomeProjectDto } from './dto/month-income-project.dto';
import { projectReportToMonthIncomeProject } from './mappers/project-report-to-month-income-project.mapper';

@Injectable()
export class IncomesService {
  private readonly logger = new Logger(IncomesService.name);

  constructor(private readonly prismaService: PrismaService) {}

  async getMonthIncome(
    monthQueryDto: MonthQueryDto,
  ): Promise<IncomeResponseDto> {
    const projectIncomes = (
      await this.prismaService.projectReport.findMany({
        where: { date: monthQueryDto.month },
        include: {
          project: { select: { name: true } },
          incomeEntries: { select: { amount: true } },
        },
      })
    ).map((report) => projectReportToProjectIncome(report));

    const totalIncome = projectIncomes.reduce((sum, r) => sum + r.income, 0);
    const totalProfit = projectIncomes.reduce((sum, r) => sum + r.profit, 0);

    this.logger.log(
      `Retrieved the income for ${String(monthQueryDto.month)}: ${totalIncome}`,
    );

    return { totalIncome, totalProfit, projectIncomes };
  }

  async getAllMonthsIncome(): Promise<MonthlyIncomeDto[]> {
    const allReports = await this.prismaService.projectReport.findMany({
      include: {
        project: {
          select: {
            name: true,
            estimatedAmount: true,
            client: { select: { name: true } },
          },
        },
        incomeEntries: { select: { amount: true, incomeDate: true } },
      },
      orderBy: { date: 'asc' },
    });

    const paidIncomeByProject = new Map<string, number>();
    for (const r of allReports) {
      const paidAmount = r.incomeEntries
        .filter((e) => e.incomeDate !== null)
        .reduce((sum, e) => sum + e.amount.toNumber(), 0);
      if (paidAmount > 0) {
        paidIncomeByProject.set(
          r.projectId,
          (paidIncomeByProject.get(r.projectId) ?? 0) + paidAmount,
        );
      }
    }

    const monthMap = new Map<string, MonthIncomeProjectDto[]>();
    for (const r of allReports) {
      const month = r.date.toISOString().slice(0, 7);
      const totalPaid = paidIncomeByProject.get(r.projectId) ?? 0;
      const dto = projectReportToMonthIncomeProject(r, totalPaid);
      if (!monthMap.has(month)) monthMap.set(month, []);
      monthMap.get(month)!.push(dto);
    }

    this.logger.log(`Retrieved income for ${monthMap.size} months`);

    return Array.from(monthMap.entries()).map(([month, projects]) => ({
      month,
      projects,
    }));
  }
}
