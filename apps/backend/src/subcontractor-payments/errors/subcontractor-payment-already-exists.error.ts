import { EntityAlreadyExistsError } from 'src/common/errors/entity-already-exists.error';

export class SubcontractorPaymentAlreadyExistsError extends EntityAlreadyExistsError {
  constructor(subcontractorId: string) {
    super(
      `Subcontractor payment for subcontractor ${subcontractorId} already exists for this service month`,
    );
    this.name = 'SubcontractorPaymentAlreadyExistsError';
  }
}
