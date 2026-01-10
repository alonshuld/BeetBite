import { EntityNotFoundError } from '../../common/errors/entity-not-found.error';

export class CorporationNotFoundError extends EntityNotFoundError {
  constructor(corporationId: string) {
    super(`Corporation with ID ${corporationId} not found`);
    this.name = 'CorporationNotFoundError';
  }
}
