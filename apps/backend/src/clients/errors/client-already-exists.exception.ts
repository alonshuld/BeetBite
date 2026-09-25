import { EntityAlreadyExistsError } from '../../common/errors/entity-already-exists.error';

/**
 * Raised whenever a new client's parameters are in conflict with an existing client.
 */
export class ClientAlreadyExistsError extends EntityAlreadyExistsError {
  /**
   * Creates a new ClientAlreadyExistsError instance.
   * @param clientName The name of the client that already exists.
   */
  constructor(clientName: string) {
    super(
      `A client with the name ${clientName} already exists`,
      'CLIENT_ALREADY_EXISTS',
      { name: clientName },
    );
    this.name = 'ClientAlreadyExistsError';
  }
}
