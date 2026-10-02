import { EntityAlreadyExistsError } from '../../common/errors/entity-already-exists.error';

/**
 * Error thrown when attempting to create a supplier that already exists.
 */
export class SupplierAlreadyExistsError extends EntityAlreadyExistsError {
  constructor(supplierName: string) {
    super(
      `Supplier with name ${supplierName} already exists`,
      'SUPPLIER_ALREADY_EXISTS',
      { name: supplierName },
    );
    this.name = 'SupplierAlreadyExistsError';
  }
}
