import { EntityError } from './entity.error';

/**
 * Error thrown when an entity already exists in the system.
 */
export class EntityExistsError extends EntityError {
  constructor(message: string) {
    super(message);
    this.name = 'EntityExistsError';
  }
}
