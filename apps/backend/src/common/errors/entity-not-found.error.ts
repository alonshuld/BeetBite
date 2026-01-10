import { EntityError } from './entity.error';

/**
 * Error thrown when an entity is not found in the system.
 */
export class EntityNotFoundError extends EntityError {
  constructor(message: string) {
    super(message);
    this.name = 'EntityNotFoundError';
  }
}
