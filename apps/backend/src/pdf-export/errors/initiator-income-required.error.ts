import { BadRequestException } from '@nestjs/common';

import type { CodedError } from '../../common/errors/coded-error';

/**
 * Raised when a PDF export is requested for a report whose project has an
 * initiator, but the report itself has no `initiatorIncome` set yet — the
 * field only matters for this export, so it is enforced here rather than at
 * save time.
 */
export class InitiatorIncomeRequiredError
  extends BadRequestException
  implements CodedError
{
  readonly code = 'INITIATOR_INCOME_REQUIRED_FOR_EXPORT';

  constructor() {
    super(
      "Set this report's initiator income before exporting its PDF — the project has an initiator linked",
    );
  }
}
