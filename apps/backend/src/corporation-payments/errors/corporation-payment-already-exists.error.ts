import { EntityAlreadyExistsError } from 'src/common/errors/entity-already-exists.error';

/**
 * Raised whenever a corporation payment already exists for the same corporation in the same month.
 */
export class CorporationPaymentAlreadyExistsError extends EntityAlreadyExistsError {
  /**
   * Creates a new CorporationPaymentAlreadyExistsError.
   * @param corporationId The ID of the corporation a payment already exists for in the same month
   * @param date The date of the existing payment
   */
  constructor(corporationId: string, date: string) {
    super(
      `A corporation payment for corporation ${corporationId} in the month ${date} already exists`,
    );
    this.name = 'CorporationPaymentAlreadyExistsError';
  }
}
