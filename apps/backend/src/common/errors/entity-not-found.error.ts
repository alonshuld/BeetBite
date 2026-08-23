import { EntityError } from './entity.error';

/**
 * Error thrown when an entity is not found in the system.
 */
export class EntityNotFoundError extends EntityError {
  /**
   * EntityNotFoundError constructor
   * @param message Message describing the error
   */
  constructor(message: string) {
    super(message);
    this.name = 'EntityNotFoundError';
  }
}
