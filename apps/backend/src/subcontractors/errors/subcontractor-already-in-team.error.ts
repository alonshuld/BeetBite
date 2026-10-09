import { EntityAlreadyExistsError } from 'src/common/errors/entity-already-exists.error';

/**
 * Error thrown when a subcontractor who already belongs to one team is put in
 * another. A subcontractor works in at most one team.
 */
export class SubcontractorAlreadyInTeamError extends EntityAlreadyExistsError {
  /**
   * SubcontractorAlreadyInTeamError constructor
   * @param name Name of the subcontractor already in a team
   */
  constructor(name: string) {
    super(
      `Subcontractor ${name} already belongs to a team`,
      'SUBCONTRACTOR_ALREADY_IN_TEAM',
      { name },
    );
    this.name = 'SubcontractorAlreadyInTeamError';
  }
}
