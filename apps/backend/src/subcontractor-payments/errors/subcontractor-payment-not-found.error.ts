import { EntityNotFoundError } from '../../common/errors/entity-not-found.error';

/**
 * Error thrown when a subcontractor payment is not found.
 */
export class SubcontractorPaymentNotFoundError extends EntityNotFoundError {
  constructor(subcontractorPaymentId: string) {
    super(
      `Subcontractor payment with ID ${subcontractorPaymentId} not found`,
      'SUBCONTRACTOR_PAYMENT_NOT_FOUND',
    );
    this.name = 'SubcontractorPaymentNotFoundError';
  }
}
