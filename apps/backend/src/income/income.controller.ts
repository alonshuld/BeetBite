import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IncomeService } from './income.service';
import { MonthlyIncomeItemDto } from './dto/monthly-income-item.dto';
import { MonthQueryDto } from 'src/common/month-query.dto';

@ApiTags('income')
@Controller('income')
export class IncomeController {
  constructor(private readonly incomeService: IncomeService) {}

  @Get()
  @ApiOperation({ summary: 'Get monthly income grouped by client' })
  @ApiResponse({
    status: 200,
    description: 'Monthly income grouped by client and project',
    type: [MonthlyIncomeItemDto],
  })
  getMonthlyIncome(
    @Query() { month }: MonthQueryDto,
  ): Promise<MonthlyIncomeItemDto[]> {
    return this.incomeService.getMonthlyIncome(month);
  }
}
