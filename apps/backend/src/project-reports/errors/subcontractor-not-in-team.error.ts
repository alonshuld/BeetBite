import { BadRequestException } from '@nestjs/common';

import type { CodedError } from '../../common/errors/coded-error';

/**
 * Raised when a report's project is handed to a subcontractor outside the
 * team of the one currently on it. Only a teammate can take it over here.
 */
export class SubcontractorNotInTeamError
  extends BadRequestException
  implements CodedError
{
  readonly code = 'SUBCONTRACTOR_NOT_IN_TEAM';

  constructor(subcontractorId: string) {
    super(
      `Subcontractor ${subcontractorId} is not in the team of the report's current subcontractor`,
    );
  }
}
