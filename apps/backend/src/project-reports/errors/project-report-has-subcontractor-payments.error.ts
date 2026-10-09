import { EntityHasRelatedRecordsError } from '../../common/errors/entity-has-related-records.error';

/**
 * Raised when switching a report's subcontractor while payments for that
 * project and month are already recorded against the current one — the
 * payments would be left settling an amount nobody owes.
 */
export class ProjectReportHasSubcontractorPaymentsError extends EntityHasRelatedRecordsError {
  constructor(projectReportId: string) {
    super(
      'project report',
      'subcontractor payments',
      'PROJECT_REPORT_HAS_SUBCONTRACTOR_PAYMENTS',
    );
    this.message = `Cannot change the subcontractor of project report ${projectReportId}: payments are already recorded for it. Remove them first.`;
    this.name = 'ProjectReportHasSubcontractorPaymentsError';
  }
}
