import { BadRequestException } from '@nestjs/common';

import type { CodedError } from '../../common/errors/coded-error';

/**
 * Raised when a caller sets `initiatorIncome` on a report whose project has
 * no initiator linked — the field is only ever meaningful alongside one.
 */
export class InitiatorIncomeNotAllowedError
  extends BadRequestException
  implements CodedError
{
  readonly code = 'INITIATOR_INCOME_NOT_ALLOWED';

  constructor() {
    super(
      'Initiator income can only be set on a project report whose project has an initiator linked',
    );
  }
}
