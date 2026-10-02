import { EntityNotFoundError } from 'src/common/errors/entity-not-found.error';

/**
 * Raised when the project report requested for export does not exist.
 */
export class NoReportsForExportError extends EntityNotFoundError {
  constructor(projectReportId: string) {
    super(
      `No project report found with id ${projectReportId}`,
      'NO_REPORTS_FOR_EXPORT',
    );
    this.name = 'NoReportsForExportError';
  }
}
