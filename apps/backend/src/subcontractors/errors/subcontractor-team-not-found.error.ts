import { EntityNotFoundError } from 'src/common/errors/entity-not-found.error';

/**
 * Error thrown when a subcontractor team is not found.
 */
export class SubcontractorTeamNotFoundError extends EntityNotFoundError {
  /**
   * SubcontractorTeamNotFoundError constructor
   * @param teamId The ID of the team that was not found
   */
  constructor(teamId: string) {
    super(
      `Subcontractor team with ID ${teamId} not found`,
      'SUBCONTRACTOR_TEAM_NOT_FOUND',
    );
    this.name = 'SubcontractorTeamNotFoundError';
  }
}
