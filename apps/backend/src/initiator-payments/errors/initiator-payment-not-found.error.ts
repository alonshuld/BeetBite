import { EntityNotFoundError } from '../../common/errors/entity-not-found.error';

/**
 * Error thrown when an initiator payment is not found.
 */
export class InitiatorPaymentNotFoundError extends EntityNotFoundError {
  constructor(paymentId?: string) {
    super(
      paymentId
        ? `Initiator payment with ID ${paymentId} not found`
        : 'Initiator payment not found',
    );
    this.name = 'InitiatorPaymentNotFoundError';
  }
}
