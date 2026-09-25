import { BadRequestException } from '@nestjs/common';

import type { CodedError } from '../../common/errors/coded-error';

/**
 * Raised when `initiatorIncome` is set to a value that does not exceed the
 * report's own (actual) income — it always has to be the larger figure.
 */
export class InitiatorIncomeTooLowError
  extends BadRequestException
  implements CodedError
{
  readonly code = 'INITIATOR_INCOME_TOO_LOW';

  constructor() {
    super("Initiator income must be greater than the report's own income");
  }
}
