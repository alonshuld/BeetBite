import { EntityNotFoundError } from 'src/common/errors/entity-not-found.error';

/**
 * Raised whenever a corporation payment is not found in the system.
 */
export class CorporationPaymentNotFoundError extends EntityNotFoundError {
  /**
   * Creates a new CorporationPaymentNotFoundError instance.
   * @param corporationPaymentId The ID of the corporation payment that was not found.
   */
  constructor(corporationPaymentId: string) {
    super(`Corporation payment with ID ${corporationPaymentId} not found`);
    this.name = 'CorporationPaymentNotFoundError';
  }
}
