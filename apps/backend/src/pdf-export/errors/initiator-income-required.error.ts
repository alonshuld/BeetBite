import { BadRequestException } from '@nestjs/common';

/**
 * Raised when a PDF export is requested for a report whose project has an
 * initiator, but the report itself has no `initiatorIncome` set yet — the
 * field only matters for this export, so it is enforced here rather than at
 * save time.
 */
export class InitiatorIncomeRequiredError extends BadRequestException {
  constructor() {
    super(
      "Set this report's initiator income before exporting its PDF — the project has an initiator linked",
    );
  }
}
