import { Body, Controller, Get, Put, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { VatRatesService } from './vat-rates.service';
import { UpsertVatRateDto } from './dto/upsert-vat-rate.dto';
import { VatRateResponseDto } from './dto/vat-rate-response.dto';
import { ResolvedVatRateResponseDto } from './dto/resolved-vat-rate-response.dto';
import { MonthQueryDto } from 'src/common/month-query.dto';

/**
 * Controller for the company's monthly-versioned VAT rate history.
 * @param vatRatesService Service providing VAT rate business logic
 */
@ApiBearerAuth()
@ApiTags('vat-rates')
@Controller('vat-rates')
export class VatRatesController {
  constructor(private readonly vatRatesService: VatRatesService) {}

  /**
   * Set (or override) the VAT percentage effective from a given month onward.
   * @param upsertVatRateDto Payload with the effective month and percentage
   * @returns The upserted `VatRateResponseDto`
   */
  @Put()
  @ApiOperation({
    summary: 'Set the VAT percentage effective from a given month onward',
  })
  @ApiOkResponse({ type: VatRateResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  async upsert(
    @Body() upsertVatRateDto: UpsertVatRateDto,
  ): Promise<VatRateResponseDto> {
    return await this.vatRatesService.upsertForMonth(upsertVatRateDto);
  }

  /**
   * Retrieve the full VAT rate history, most recent first.
   * @returns All configured VAT rate entries
   */
  @Get()
  @ApiOperation({ summary: 'Get the VAT rate history' })
  @ApiOkResponse({ type: VatRateResponseDto, isArray: true })
  async findHistory(): Promise<VatRateResponseDto[]> {
    return await this.vatRatesService.findHistory();
  }

  /**
   * Resolve the VAT percentage effective for a given month.
   * @param monthQueryDto Month to resolve the effective VAT rate for
   * @returns The effective percentage, or null if none configured yet
   */
  @Get('resolve')
  @ApiOperation({ summary: 'Resolve the VAT percentage effective for a month' })
  @ApiQuery({ name: 'month', type: MonthQueryDto })
  @ApiOkResponse({ type: ResolvedVatRateResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid month query' })
  async resolve(
    @Query() monthQueryDto: MonthQueryDto,
  ): Promise<ResolvedVatRateResponseDto> {
    const percentage = await this.vatRatesService.resolveForMonth(
      monthQueryDto.month,
    );
    return { percentage };
  }
}
