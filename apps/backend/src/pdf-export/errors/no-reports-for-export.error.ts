import { EntityNotFoundError } from 'src/common/errors/entity-not-found.error';

/**
 * Raised when no project reports match the requested subcontractor, client, and month.
 */
export class NoReportsForExportError extends EntityNotFoundError {
  constructor(subcontractorId: string, clientId: string, month: string) {
    super(
      `No project reports found for subcontractor ${subcontractorId}, client ${clientId}, month ${month}`,
    );
    this.name = 'NoReportsForExportError';
  }
}
