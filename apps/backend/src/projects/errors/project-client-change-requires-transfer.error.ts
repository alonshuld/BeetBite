import { BadRequestException } from '@nestjs/common';

import type { CodedError } from '../../common/errors/coded-error';

/**
 * Raised when a project edit tries to change the project's client.
 *
 * The client is a history (one assignment per change, effective from a
 * month), and `Project.clientId` only caches its latest entry. Writing the
 * cache directly would leave every month-scoped screen on the old client, so
 * a change of client has to go through the transfer endpoint instead.
 */
export class ProjectClientChangeRequiresTransferError
  extends BadRequestException
  implements CodedError
{
  readonly code = 'PROJECT_CLIENT_CHANGE_REQUIRES_TRANSFER';

  constructor() {
    super(
      "A project's client cannot be changed by editing it. Use Transfer to another client and choose the month the change starts from.",
    );
  }
}
