import { EntityNotFoundError } from 'src/common/errors/entity-not-found.error';

/**
 * Raised whenever a supplier payment is not found in the system.
 */
export class SupplierPaymentNotFoundError extends EntityNotFoundError {
  /**
   * Creates a new SupplierPaymentNotFoundError instance.
   * @param supplierPaymentId The ID of the supplier payment that was not found.
   */
  constructor(supplierPaymentId: string) {
    super(
      `Supplier payment with ID ${supplierPaymentId} not found`,
      'SUPPLIER_PAYMENT_NOT_FOUND',
    );
    this.name = 'SupplierPaymentNotFoundError';
  }
}
