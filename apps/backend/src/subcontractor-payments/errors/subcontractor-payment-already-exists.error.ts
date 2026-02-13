import { EntityAlreadyExistsError } from '../../common/errors/entity-already-exists.error';

/**
 * Error thrown when attempting to create a subcontractor payment that already exists.
 */
export class SubcontractorPaymentAlreadyExistsError extends EntityAlreadyExistsError {
  constructor(subcontractorId: string, date: string) {
    super(`Subcontractor: ${subcontractorId} already has a payment at ${date}`);
    this.name = 'SubcontractorPaymentAlreadyExistsError';
  }
}
