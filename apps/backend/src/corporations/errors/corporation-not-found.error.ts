import { EntityNotFoundError } from '../../common/errors/entity-not-found.error';

/**
 * Error thrown when a corporation is not found.
 */
export class CorporationNotFoundError extends EntityNotFoundError {
  /**
   * Creates a new CorporationNotFoundError instance.
   *
   * @param corporationId The ID of the corporation that was not found.
   */
  constructor(corporationId: string);

  constructor();
  constructor(corporationId?: string) {
    if (corporationId === undefined) super(`Corporation not found`);
    else super(`Corporation with ID ${corporationId} not found`);
    this.name = 'CorporationNotFoundError';
  }
}
