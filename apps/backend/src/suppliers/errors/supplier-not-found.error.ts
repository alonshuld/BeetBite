import { EntityNotFoundError } from '../../common/errors/entity-not-found.error';

/**
 * Error thrown when a supplier is not found.
 */
export class SupplierNotFoundError extends EntityNotFoundError {
  /**
   * Creates a new SupplierNotFoundError instance.
   *
   * @param supplierId The ID of the supplier that was not found.
   */
  constructor(supplierId?: string) {
    super(
      supplierId
        ? `Supplier with ID ${supplierId} not found`
        : 'Supplier not found',
    );
    this.name = 'SupplierNotFoundError';
  }
}
