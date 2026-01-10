import { EntityExistsError } from 'src/common/errors/entity-exists.error';

/**
 * Error thrown when attempting to create a subcontractor that already exists.
 */
export class SubcontractorExistsError extends EntityExistsError {
  constructor(subcontractorId: string) {
    super(`Subcontractor with ID ${subcontractorId} already exists`);
    this.name = 'SubcontractorExistsError';
  }
}
