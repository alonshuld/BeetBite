import { CompanySettings } from 'src/generated/client';
import { CompanySettingsResponseDto } from '../dto/company-settings-response.dto';

/**
 * Converts the given company settings entity to a company settings response DTO.
 * @param settings The company settings entity to convert.
 * @returns The company settings response DTO.
 */
export const toCompanySettingsResponse = (
  settings: CompanySettings,
): CompanySettingsResponseDto => ({
  id: settings.id,
  name: settings.name,
  description: settings.description,
  companyNumber: settings.companyNumber,
  logo: settings.logo,
  signature: settings.signature,
  updatedAt: settings.updatedAt.toISOString(),
});
