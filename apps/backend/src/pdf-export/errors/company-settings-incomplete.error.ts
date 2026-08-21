import { BadRequestException } from '@nestjs/common';

/**
 * Raised when a PDF export is requested but the company settings are missing
 * the name and/or company number required to appear on an exported document.
 */
export class CompanySettingsIncompleteError extends BadRequestException {
  constructor() {
    super(
      'Company settings must have a name and company number configured before exporting a PDF',
    );
  }
}
