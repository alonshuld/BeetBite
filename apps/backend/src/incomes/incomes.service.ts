import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { IncomeResponseDto } from './dto/income-response.dto';
import { MonthQueryDto } from 'src/common/month-query.dto';
import { projectReportToProjectIncome } from './mappers/project-report-to-project-income.mapper';
import { MonthlyIncomeDto } from './dto/monthly-income.dto';
import { MonthIncomeProjectDto } from './dto/month-income-project.dto';
import { projectReportToMonthIncomeProject } from './mappers/project-report-to-month-income-project.mapper';

/**
 * Service providing income business logic.
 * @param prismaService PrismaService for database interactions
 */
@Injectable()
export class IncomesService {
  private readonly logger = new Logger(IncomesService.name);

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Get the total income, total profit, and project incomes
   * @param date The date of the income report
   * @returns The income response DTO
   */
  async getMonthIncome(
    monthQueryDto: MonthQueryDto,
  ): Promise<IncomeResponseDto> {
    const projectIncomes = (
      await this.prismaService.projectReport.findMany({
        where: {
          date: monthQueryDto.month,
        },
        include: {
          project: {
            select: {
              name: true,
            },
          },
        },
      })
    ).map((report) => projectReportToProjectIncome(report));

    const totalIncome = projectIncomes.reduce(
      (sum, report) => sum + report.income,
      0,
    );
    const totalProfit = projectIncomes.reduce(
      (sum, report) => sum + report.profit,
      0,
    );

    this.logger.log(
      `Retrieved the income for ${monthQueryDto.month}: ${totalIncome}`,
    );

    return { totalIncome, totalProfit, projectIncomes };
  }

  async getAllMonthsIncome(): Promise<MonthlyIncomeDto[]> {
    const allReports = await this.prismaService.projectReport.findMany({
      include: {
        project: { select: { name: true, estimatedAmount: true } },
      },
      orderBy: { date: 'asc' },
    });

    const paidIncomeByProject = new Map<string, number>();
    for (const r of allReports) {
      if (r.incomeDate !== null) {
        paidIncomeByProject.set(
          r.projectId,
          (paidIncomeByProject.get(r.projectId) ?? 0) + r.income.toNumber(),
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
