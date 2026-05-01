import { EntityNotFoundError } from '../../common/errors/entity-not-found.error';

/**
 * Raised whenever a user is not found in the system.
 */
export class UserNotFoundError extends EntityNotFoundError {
  /**
   * Creates a new UserNotFoundError instance.
   * @param identifier The username or ID that was not found
   */
  constructor(identifier: string) {
    super(`User '${identifier}' not found`);
    this.name = 'UserNotFoundError';
  }
}
