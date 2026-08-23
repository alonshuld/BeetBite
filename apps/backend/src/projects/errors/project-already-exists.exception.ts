import { EntityAlreadyExistsError } from 'src/common/errors/entity-already-exists.error';

/**
 * Raised whenever a new project's parameters are in conflict with an existing project.
 */
export class ProjectAlreadyExistsError extends EntityAlreadyExistsError {
  /**
   * Creates a new ProjectAlreadyExistsError.
   * @param projectName The name of the project that already exists.
   */
  constructor(projectName: string) {
    super(`A project with the name ${projectName} already exists`);
    this.name = 'ProjectAlreadyExistsError';
  }
}
