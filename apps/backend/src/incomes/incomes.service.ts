import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { IncomeResponseDto } from './dto/income-response.dto';
import { MonthQueryDto } from 'src/common/month-query.dto';

/**
 * Service providing income business logic.
 * @param prismaService PrismaService for database interactions
 */
@Injectable()
export class IncomesService {
  private readonly logger = new Logger(IncomesService.name);

  constructor(private readonly prismaService: PrismaService) {}

  async getTotalIncome(date: MonthQueryDto): Promise<IncomeResponseDto> {
    try {
      const inputDate = new Date(date.month);

      const projectReports = await this.prismaService.projectReport.findMany({
        where: {
          date: inputDate,
        },
        include: {
          project: true,
        },
      });
      
    } catch (error) {
      this.logger.error('Error getting total income', error);
      throw error;
    }
  }
}
