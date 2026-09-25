import type { CodedError, ErrorParams } from './coded-error';

/**
 * Base class for entity-related errors.
 */
export class EntityError extends Error implements CodedError {
  /**
   * EntityError constructor
   * @param message Message describing the error
   * @param code Stable error code the client translates (see CodedError)
   * @param params Values interpolated into the translated message
   */
  constructor(
    message: string,
    readonly code: string = 'ENTITY_ERROR',
    readonly params?: ErrorParams,
  ) {
    super(message);
    this.name = 'EntityError';
  }
}
