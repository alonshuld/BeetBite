import { EntityNotFoundError } from '../../common/errors/entity-not-found.error';

/**
 * Error thrown when a corporation is not found.
 */
export class CorporationNotFoundError extends EntityNotFoundError {
  constructor(corporationId: string) {
    super(`Corporation with ID ${corporationId} not found`);
    this.name = 'CorporationNotFoundError';
  }
}
