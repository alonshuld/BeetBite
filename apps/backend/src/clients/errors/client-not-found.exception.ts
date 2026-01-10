import { EntityNotFoundError } from '../../common/errors/entity-not-found.error';

/**
 * Raised whenever a client is not found in the system.
 */
export class ClientNotFoundError extends EntityNotFoundError {
  /**
   * Creates a new ClientNotFoundError instance.
   * @param clientId The ID of the client that was not found.
   */
  constructor(clientId: string) {
    super(`Client with ID ${clientId} not found`);
    this.name = 'ClientNotFoundError';
  }
}
