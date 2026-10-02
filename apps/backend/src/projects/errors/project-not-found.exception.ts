import { EntityNotFoundError } from '../../common/errors/entity-not-found.error';

/**
 * Raised whenever a project is not found in the system.
 */
export class ProjectNotFoundError extends EntityNotFoundError {
  /**
   * Creates a new ProjectNotFoundError instance.
   * @param projectId The ID of the project that was not found.
   */
  constructor(projectId: string) {
    super(`Project with ID ${projectId} not found`, 'PROJECT_NOT_FOUND');
    this.name = 'ProjectNotFoundError';
  }
}
