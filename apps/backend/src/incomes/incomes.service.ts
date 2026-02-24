import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { IncomeResponseDto } from './dto/income-response.dto';
import { MonthQueryDto } from 'src/common/month-query.dto';
import { projectReportToProjectIncome } from './mappers/project-report-to-project-income.mapper';

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
}
