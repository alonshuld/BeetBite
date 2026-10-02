import { BadRequestException } from '@nestjs/common';

import type { CodedError } from '../../common/errors/coded-error';

/**
 * Raised when a PDF export is requested but the company settings are missing
 * the name and/or company number required to appear on an exported document.
 */
export class CompanySettingsIncompleteError
  extends BadRequestException
  implements CodedError
{
  readonly code = 'COMPANY_SETTINGS_INCOMPLETE';

  constructor() {
    super(
      'Company settings must have a name and company number configured before exporting a PDF',
    );
  }
}
