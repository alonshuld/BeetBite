import { EntityError } from '../../common/errors/entity.error';

/**
 * Error thrown when removing the earliest assignment of a project is attempted.
 *
 * Every project must always have at least one assignment covering the whole of
 * its history — without one, its reports would resolve to no client and vanish
 * from every month-scoped view.
 */
export class CannotRemoveEarliestAssignmentError extends EntityError {
  constructor() {
    super(
      'Cannot remove a project’s first client assignment. Every project must always have one. Change its client instead.',
      'CANNOT_REMOVE_EARLIEST_ASSIGNMENT',
    );
    this.name = 'CannotRemoveEarliestAssignmentError';
  }
}
