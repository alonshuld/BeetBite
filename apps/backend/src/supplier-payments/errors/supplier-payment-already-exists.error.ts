import { EntityAlreadyExistsError } from 'src/common/errors/entity-already-exists.error';

/**
 * Raised whenever a supplier payment already exists for the same supplier in the same month.
 */
export class SupplierPaymentAlreadyExistsError extends EntityAlreadyExistsError {
  /**
   * Creates a new SupplierPaymentAlreadyExistsError.
   * @param supplierId The ID of the supplier a payment already exists for in the same month
   * @param date The date of the existing payment
   */
  constructor(supplierId: string, date: string) {
    super(
      `A supplier payment for supplier ${supplierId} in the month ${date} already exists`,
    );
    this.name = 'SupplierPaymentAlreadyExistsError';
  }
}
