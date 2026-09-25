import type { ErrorParams } from './coded-error';
import { EntityError } from './entity.error';

/**
 * Error thrown when an entity is not found in the system.
 */
export class EntityNotFoundError extends EntityError {
  /**
   * EntityNotFoundError constructor
   * @param message Message describing the error
   * @param code Stable error code the client translates (see CodedError)
   * @param params Values interpolated into the translated message
   */
  constructor(message: string, code = 'NOT_FOUND', params?: ErrorParams) {
    super(message, code, params);
    this.name = 'EntityNotFoundError';
  }
}
