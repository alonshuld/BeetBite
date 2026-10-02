import { BadRequestException } from '@nestjs/common';

import type { CodedError } from '../../common/errors/coded-error';

/**
 * Raised when a client-simulated export carries a margin override for a
 * project that has no report under that client in the requested month.
 */
export class ProjectNotInClientExportError
  extends BadRequestException
  implements CodedError
{
  readonly code = 'PROJECT_NOT_IN_CLIENT_EXPORT';

  constructor(projectId: string) {
    super(
      `Project ${projectId} is not one of this client's projects for the given month`,
    );
  }
}
