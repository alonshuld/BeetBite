import { EntityError } from './entity.error';

export class EntityNotFoundError extends EntityError {
  constructor(message: string) {
    super(message);
    this.name = 'EntityNotFoundError';
  }
}
