import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpsertCompanySettingsDto } from './dto/upsert-company-settings.dto';
import { CompanySettingsResponseDto } from './dto/company-settings-response.dto';
import { toCompanySettingsResponse } from './mappers/company-settings.mapper';

const SETTINGS_ID = 'company-settings';

/**
 * Service for managing the contractor's singleton company settings record.
 * @param prismaService PrismaService for database interactions
 */
@Injectable()
export class CompanySettingsService {
  private readonly logger = new Logger(CompanySettingsService.name);

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Finds the company settings record.
   * @returns The company settings, or `null` if never configured.
   */
  async findOne(): Promise<CompanySettingsResponseDto | null> {
    const settings = await this.prismaService.companySettings.findUnique({
      where: { id: SETTINGS_ID },
    });

    if (!settings) {
      return null;
    }

    this.logger.log('Company settings retrieved');
    return toCompanySettingsResponse(settings);
  }

  /**
   * Creates or replaces the company settings record.
   * @param upsertCompanySettingsDto The DTO containing company profile details.
   * @returns The upserted company settings.
   */
  async upsert(
    upsertCompanySettingsDto: UpsertCompanySettingsDto,
  ): Promise<CompanySettingsResponseDto> {
    const settings = await this.prismaService.companySettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, ...upsertCompanySettingsDto },
      update: { ...upsertCompanySettingsDto },
    });

    this.logger.log('Company settings upserted');
    return toCompanySettingsResponse(settings);
  }
}
