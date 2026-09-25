import { BadRequestException } from '@nestjs/common';

/**
 * Raised when `initiatorIncome` is set to a value that does not exceed the
 * report's own (actual) income — it always has to be the larger figure.
 */
export class InitiatorIncomeTooLowError extends BadRequestException {
  constructor() {
    super("Initiator income must be greater than the report's own income");
  }
}
