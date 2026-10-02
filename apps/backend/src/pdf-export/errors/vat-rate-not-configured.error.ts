import { BadRequestException } from '@nestjs/common';

import type { CodedError, ErrorParams } from '../../common/errors/coded-error';

/**
 * Raised when a PDF export is requested for a month with no resolvable VAT rate
 * (no VAT rate has ever been configured on or before that month).
 */
export class VatRateNotConfiguredError
  extends BadRequestException
  implements CodedError
{
  readonly code = 'VAT_RATE_NOT_CONFIGURED';
  readonly params: ErrorParams;

  constructor(month: string) {
    super(`No VAT rate has been configured for or before ${month}`);
    this.params = { month: month.slice(0, 7) };
  }
}
