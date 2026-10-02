import { EntityNotFoundError } from '../../common/errors/entity-not-found.error';

/**
 * Raised whenever a project report is not found in the system.
 */
export class ProjectReportNotFoundError extends EntityNotFoundError {
  /**
   * Creates a new ProjectReportNotFoundError instance.
   * @param projectReportId The ID of the project report that was not found.
   */
  constructor(projectReportId: string);

  /**
   * Creates a new ProjectReportNotFoundError instance.
   * @param projectId The ID of the project whose report in the given month could not be found.
   * @param date The date for which a project report for the project with the given ID could not be found.
   */
  constructor(projectId: string, date: string);
  constructor(projectReportIdOrProjectId: string, date?: string) {
    if (!date) {
      super(
        `Project report with ID ${projectReportIdOrProjectId} not found`,
        'PROJECT_REPORT_NOT_FOUND',
      );
    } else {
      super(
        `Project report for project ${projectReportIdOrProjectId} at date ${date} could not be found`,
        'PROJECT_REPORT_NOT_FOUND',
        { month: date.slice(0, 7) },
      );
    }
    this.name = 'ProjectReportNotFoundError';
  }
}
