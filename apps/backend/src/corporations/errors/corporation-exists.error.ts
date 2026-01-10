import { EntityExistsError } from '../../common/errors/entity-exists.error';

/**
 * Error thrown when attempting to create a corporation that already exists.
 */
export class CorporationExistsError extends EntityExistsError {
  constructor(corporationName: string) {
    super(`Corporation with name ${corporationName} already exists`);
    this.name = 'CorporationExistsError';
  }
}
