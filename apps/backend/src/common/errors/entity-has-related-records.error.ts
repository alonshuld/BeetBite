import { EntityAlreadyExistsError } from './entity-already-exists.error';

/**
 * Error thrown when an entity cannot be deleted because it has related records.
 * Maps to HTTP 409 Conflict via EntityExceptionFilter.
 */
export class EntityHasRelatedRecordsError extends EntityAlreadyExistsError {
  constructor(entityName: string, relatedEntity: string) {
    super(
      `Cannot delete ${entityName} because it has related ${relatedEntity}. Remove them first.`,
    );
    this.name = 'EntityHasRelatedRecordsError';
  }
}
