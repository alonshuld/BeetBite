import { EntityNotFoundError } from '../../common/errors/entity-not-found.error';

/**
 * Error thrown when an initiator is not found.
 */
export class InitiatorNotFoundError extends EntityNotFoundError {
  /**
   * Creates a new InitiatorNotFoundError instance.
   *
   * @param initiatorId The ID of the initiator that was not found.
   */
  constructor(initiatorId?: string) {
    super(
      initiatorId
        ? `Initiator with ID ${initiatorId} not found`
        : 'Initiator not found',
      'INITIATOR_NOT_FOUND',
    );
    this.name = 'InitiatorNotFoundError';
  }
}
