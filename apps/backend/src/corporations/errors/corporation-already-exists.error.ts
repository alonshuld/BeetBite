import { EntityAlreadyExistsError } from '../../common/errors/entity-already-exists.error';

/**
 * Error thrown when attempting to create a corporation that already exists.
 */
export class CorporationAlreadyExistsError extends EntityAlreadyExistsError {
  constructor(corporationName: string) {
    super(`Corporation with name ${corporationName} already exists`);
    this.name = 'CorporationAlreadyExistsError';
  }
}
