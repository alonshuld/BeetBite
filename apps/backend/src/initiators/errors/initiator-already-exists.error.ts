import { EntityAlreadyExistsError } from '../../common/errors/entity-already-exists.error';

/**
 * Error thrown when attempting to create an initiator that already exists.
 */
export class InitiatorAlreadyExistsError extends EntityAlreadyExistsError {
  constructor(initiatorName: string) {
    super(`Initiator with name ${initiatorName} already exists`);
    this.name = 'InitiatorAlreadyExistsError';
  }
}
