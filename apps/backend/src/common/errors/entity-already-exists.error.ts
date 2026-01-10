import { EntityError } from './entity.error';

/**
 * Error thrown when an entity already exists in the system.
 */
export class EntityAlreadyExistsError extends EntityError {
  /**
   * EntityAlreadyExistsError constructor
   * @param message Message describing the error
   */
  constructor(message: string) {
    super(message);
    this.name = 'EntityAlreadyExistsError';
  }
}
