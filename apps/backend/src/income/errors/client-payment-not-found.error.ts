import { EntityNotFoundError } from '../../common/errors/entity-not-found.error';

/**
 * Error thrown when a client payment is not found.
 */
export class ClientPaymentNotFoundError extends EntityNotFoundError {
  constructor(clientPaymentId: string) {
    super(
      `Client payment with ID ${clientPaymentId} not found`,
      'CLIENT_PAYMENT_NOT_FOUND',
    );
    this.name = 'ClientPaymentNotFoundError';
  }
}
