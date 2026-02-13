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
  constructor(corporationId?: string) {
    super(
      corporationId
        ? `Corporation with ID ${corporationId} not found`
        : 'Corporation not found',
    );
    this.name = 'CorporationNotFoundError';
  }
}
