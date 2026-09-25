import type { ErrorParams } from './coded-error';
import { EntityError } from './entity.error';

/**
 * Error thrown when an entity already exists in the system.
 */
export class EntityAlreadyExistsError extends EntityError {
  /**
   * EntityAlreadyExistsError constructor
   * @param message Message describing the error
   * @param code Stable error code the client translates (see CodedError)
   * @param params Values interpolated into the translated message
   */
  constructor(message: string, code = 'ALREADY_EXISTS', params?: ErrorParams) {
    super(message, code, params);
    this.name = 'EntityAlreadyExistsError';
  }
}
