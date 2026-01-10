import { EntityError } from './entity.error';

/**
 * Error thrown when an entity already exists in the system.
 */
export class EntityAlreadyExistsError extends EntityError {
  constructor(message: string) {
    super(message);
    this.name = 'EntityAlreadyExistsError';
  }
}
