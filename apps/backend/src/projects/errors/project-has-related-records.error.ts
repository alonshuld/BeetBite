import { EntityHasRelatedRecordsError } from 'src/common/errors/entity-has-related-records.error';

/**
 * Raised when deleting a project that still has reports or payments.
 */
export class ProjectHasRelatedRecordsError extends EntityHasRelatedRecordsError {
  constructor() {
    super('project', 'reports or payments', 'PROJECT_HAS_RELATED_RECORDS');
    this.name = 'ProjectHasRelatedRecordsError';
  }
}
