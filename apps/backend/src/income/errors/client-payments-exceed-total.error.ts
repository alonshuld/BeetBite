import { BadRequestException } from '@nestjs/common';

import type { CodedError, ErrorParams } from '../../common/errors/coded-error';

/**
 * Thrown when turning a month's VAT off would leave the client's recorded
 * payments above the income they now owe.
 */
export class ClientPaymentsExceedTotalError
  extends BadRequestException
  implements CodedError
{
  readonly code = 'CLIENT_PAYMENTS_EXCEED_TOTAL';
  readonly params: ErrorParams;

  constructor(total: number, paid: number) {
    super(
      `Recorded client payments (${paid}) would exceed the month's total (${total})`,
    );
    this.params = { total, paid };
  }
}
