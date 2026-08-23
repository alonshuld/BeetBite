import { Controller, Get, Put, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CompanySettingsService } from './company-settings.service';
import { UpsertCompanySettingsDto } from './dto/upsert-company-settings.dto';
import { CompanySettingsResponseDto } from './dto/company-settings-response.dto';

/**
 * Controller for the contractor's singleton company settings record.
 * @param companySettingsService Service providing company settings business logic
 */
@ApiBearerAuth()
@ApiTags('company-settings')
@Controller('company-settings')
export class CompanySettingsController {
  constructor(
    private readonly companySettingsService: CompanySettingsService,
  ) {}

  /**
   * Retrieve the company settings.
   * @returns The company settings, or `null` if never configured.
   */
  @Get()
  @ApiOperation({ summary: 'Get the company settings' })
  @ApiOkResponse({
    description: 'The company settings, or null if never configured.',
    type: CompanySettingsResponseDto,
  })
  async findOne(): Promise<CompanySettingsResponseDto | null> {
    return await this.companySettingsService.findOne();
  }

  /**
   * Create or replace the company settings.
   * @param upsertCompanySettingsDto Payload with company profile properties
   * @returns The upserted `CompanySettingsResponseDto`
   */
  @Put()
  @ApiOperation({ summary: 'Create or update the company settings' })
  @ApiOkResponse({
    description: 'The company settings have been successfully saved.',
    type: CompanySettingsResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  async upsert(
    @Body() upsertCompanySettingsDto: UpsertCompanySettingsDto,
  ): Promise<CompanySettingsResponseDto> {
    return await this.companySettingsService.upsert(upsertCompanySettingsDto);
  }
}
