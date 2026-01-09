import { EntityError } from './base-entity.error';

export class EntityNotFoundError extends EntityError {
  constructor(message: string) {
    super(message);
    this.name = 'EntityNotFoundError';
  }
}
