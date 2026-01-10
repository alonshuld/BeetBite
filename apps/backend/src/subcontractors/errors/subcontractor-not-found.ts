import { EntityNotFoundError } from 'src/common/errors/entity-not-found.error';

/**
 * Error thrown when a subcontractor is not found.
 */
export class SubcontractorNotFoundError extends EntityNotFoundError {
  /**
   * SubcontractorNotFoundError constructor
   * @param subcontractorId The ID of the subcontractor that was not found
   */
  constructor(subcontractorId: string) {
    super(`Subcontractor with ID ${subcontractorId} not found`);
    this.name = 'SubcontractorNotFoundError';
  }
}
