import { EntityAlreadyExistsError } from 'src/common/errors/entity-already-exists.error';

/**
 * Raised whenever a project report already exists for the same project in the same month.
 */
export class ProjectReportAlreadyExistsError extends EntityAlreadyExistsError {
  /**
   * Creates a new ProjectReportAlreadyExistsError.
   * @param projectId The ID of the project a report already exists for in the same month
   */
  constructor(projectId: string, date: string) {
    super(
      `A project report for project ${projectId} in the month ${date} already exists`,
    );
    this.name = 'ProjectReportAlreadyExistsError';
  }
}
