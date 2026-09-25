import { EntityHasRelatedRecordsError } from 'src/common/errors/entity-has-related-records.error';

/**
 * Raised when deleting a client that has ever owned a project.
 */
export class ClientHasProjectsError extends EntityHasRelatedRecordsError {
  constructor(clientName: string, projectNames: string[]) {
    super(
      `client "${clientName}"`,
      `projects (${projectNames.join(', ')})`,
      'CLIENT_HAS_PROJECTS',
      { name: clientName, projects: projectNames.join(', ') },
    );
    this.name = 'ClientHasProjectsError';
  }
}
