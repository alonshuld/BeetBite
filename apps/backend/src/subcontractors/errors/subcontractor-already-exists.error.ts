import { EntityAlreadyExistsError } from 'src/common/errors/entity-already-exists.error';

/**
 * Error thrown when attempting to create a subcontractor that already exists.
 */
export class SubcontractorAlreadyExistsError extends EntityAlreadyExistsError {
  /**
   * SubcontractorAlreadyExistsError constructor
   * @param value The conflicting field value
   * @param field The name of the field that already exists (defaults to 'name')
   */
  constructor(value: string, field: string = 'name') {
    super(
      `Subcontractor with ${field} ${value} already exists`,
      field === 'companyNumber'
        ? 'SUBCONTRACTOR_COMPANY_NUMBER_TAKEN'
        : 'SUBCONTRACTOR_ALREADY_EXISTS',
      { value },
    );
    this.name = 'SubcontractorAlreadyExistsError';
  }
}
