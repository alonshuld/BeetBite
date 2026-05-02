import { BadRequestException } from '@nestjs/common';

export class SubcontractorPaymentOverpaymentError extends BadRequestException {
  constructor(amountOwed: number, amountPaid: number, newAmount: number) {
    super(
      `Payment of ${newAmount} would exceed amount owed. Owed: ${amountOwed}, already paid: ${amountPaid}`,
    );
  }
}
