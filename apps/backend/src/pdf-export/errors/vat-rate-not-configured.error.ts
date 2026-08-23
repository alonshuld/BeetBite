import { BadRequestException } from '@nestjs/common';

/**
 * Raised when a PDF export is requested for a month with no resolvable VAT rate
 * (no VAT rate has ever been configured on or before that month).
 */
export class VatRateNotConfiguredError extends BadRequestException {
  constructor(month: string) {
    super(`No VAT rate has been configured for or before ${month}`);
  }
}
