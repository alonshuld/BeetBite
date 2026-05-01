import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { IncomesService } from './incomes.service';
import { MonthQueryDto } from 'src/common/month-query.dto';
import { IncomeResponseDto } from './dto/income-response.dto';

/**
 * Controller for income-related endpoints.
 * Handles read monthly income operation.
 * @param incomesService IncomesService for business logic
 */
@ApiBearerAuth()
@ApiTags('incomes')
@Controller('incomes')
export class IncomesController {
  constructor(private readonly incomesService: IncomesService) {}

  /**
   * Get total income for a given month.
   * @param month The month for which to retrieve income
   * @returns The total income for the specified month and each income entry
   */
  @Get()
  @ApiOperation({ summary: 'Get total income for a given month' })
  @ApiOkResponse({
    description: 'Income for the given month',
    type: IncomeResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({ description: 'Invalid month format' })
  async getMonthIncome(
    @Query() month: MonthQueryDto,
  ): Promise<IncomeResponseDto> {
    return await this.incomesService.getMonthIncome(month);
  }
}
