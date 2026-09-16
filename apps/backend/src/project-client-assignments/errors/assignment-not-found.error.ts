import { EntityNotFoundError } from '../../common/errors/entity-not-found.error';

/**
 * Error thrown when a project-client assignment is not found.
 */
export class AssignmentNotFoundError extends EntityNotFoundError {
  /**
   * Creates a new AssignmentNotFoundError instance.
   *
   * @param assignmentId The ID of the assignment that was not found.
   */
  constructor(assignmentId?: string) {
    super(
      assignmentId
        ? `Project-client assignment with ID ${assignmentId} not found`
        : 'Project-client assignment not found',
    );
    this.name = 'AssignmentNotFoundError';
  }
}
