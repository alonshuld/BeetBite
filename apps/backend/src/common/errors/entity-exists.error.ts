import { EntityError } from './base-entity.error';

export class EntityExistsError extends EntityError {
  constructor(message: string) {
    super(message);
    this.name = 'EntityExistsError';
  }
}
