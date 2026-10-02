import { EntityAlreadyExistsError } from '../../common/errors/entity-already-exists.error';

/**
 * Error thrown when a project already has an assignment starting in the given
 * month. A project changes hands at most once per month boundary.
 */
export class AssignmentMonthTakenError extends EntityAlreadyExistsError {
  /**
   * @param effectiveFrom The month boundary that is already taken (ISO date).
   */
  constructor(effectiveFrom: string) {
    super(
      `This project already has a client change effective from ${effectiveFrom}. Edit that one instead of adding a second.`,
      'ASSIGNMENT_MONTH_TAKEN',
      { month: effectiveFrom.slice(0, 7) },
    );
    this.name = 'AssignmentMonthTakenError';
  }
}
