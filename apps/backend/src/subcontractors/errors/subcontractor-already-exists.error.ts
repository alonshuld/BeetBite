import { EntityAlreadyExistsError } from 'src/common/errors/entity-already-exists.error';

/**
 * Error thrown when attempting to create a subcontractor that already exists.
 */
export class SubcontractorAlreadyExistsError extends EntityAlreadyExistsError {
  /**
   * SubcontractorAlreadyExistsError constructor
   * @param subcontractorId The ID of the subcontractor that already exists
   */
  constructor(subcontractorId: string) {
    super(`Subcontractor with ID ${subcontractorId} already exists`);
    this.name = 'SubcontractorAlreadyExistsError';
  }
}
