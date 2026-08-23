/**
 * Base class for entity-related errors.
 */
export class EntityError extends Error {
  /**
   * EntityError constructor
   * @param message Message describing the error
   */
  constructor(message: string) {
    super(message);
    this.name = 'EntityError';
  }
}
