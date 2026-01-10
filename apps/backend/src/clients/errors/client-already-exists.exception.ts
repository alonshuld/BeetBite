import { EntityExistsError } from '../../common/errors/entity-exists.error';

// Raised whenever a new client's parameters are in conflict with an existing client.
export class ClientAlreadyExistsError extends EntityExistsError {
  constructor(clientName: string) {
    super(`A client with the name ${clientName} already exists`);
    this.name = 'ClientAlreadyExistsError';
  }
}
