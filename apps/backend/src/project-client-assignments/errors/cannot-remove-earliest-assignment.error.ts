import { BadRequestException } from '@nestjs/common';

import type { CodedError } from '../../common/errors/coded-error';

/**
 * Error thrown when removing the earliest assignment of a project is attempted.
 *
 * Every project must always have at least one assignment covering the whole of
 * its history — without one, its reports would resolve to no client and vanish
 * from every month-scoped view.
 *
 * A refused request, not a fault: it answers 400. (It once extended the plain
 * `EntityError`, which the exception filter maps to 500.)
 */
export class CannotRemoveEarliestAssignmentError
  extends BadRequestException
  implements CodedError
{
  readonly code = 'CANNOT_REMOVE_EARLIEST_ASSIGNMENT';

  constructor() {
    super(
      'Cannot remove a project’s first client assignment. Every project must always have one. Change its client instead.',
    );
    this.name = 'CannotRemoveEarliestAssignmentError';
  }
}
