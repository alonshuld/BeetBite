import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IncomeService } from './income.service';
import { MonthlyIncomeItemDto } from './dto/monthly-income-item.dto';
import { SetReportPaymentDto } from './dto/set-report-payment.dto';
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

  @Patch('reports/:id/payment')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Mark a month's income and/or VAT paid on a date, or unpaid",
  })
  @ApiParam({ name: 'id', description: 'Project report ID' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Project report not found' })
  async setReportPayment(
    @Param('id') id: string,
    @Body() dto: SetReportPaymentDto,
  ): Promise<void> {
    await this.incomeService.setReportPayment(id, dto);
  }
}
