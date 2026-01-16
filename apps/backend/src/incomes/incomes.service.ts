import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { IncomeResponseDto } from './dto/income-response.dto';
import { MonthQueryDto } from 'src/common/month-query.dto';
import { projectReportsToIncome } from './mappers/project-reports-to-income.mapper';

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
    const month = new Date(monthQueryDto.month);

    const projectReports = await this.prismaService.projectReport.findMany({
      where: {
        date: month,
      },
      include: {
        project: {
          select: {
            name: true,
          },
        },
      },
    });

    this.logger.log(
      `Retrieved income for the date: ${month.toLocaleDateString()}`,
    );

    return projectReportsToIncome(projectReports);
  }
}
