import { BadRequestException } from '@nestjs/common';

export class SubcontractorPaymentOverpaymentError extends BadRequestException {
  constructor(
    amountOwed: number,
    amountPaid: number,
    newAmount: number,
    paymentId?: string,
  ) {
    const context = paymentId ? ` (payment ID: ${paymentId})` : '';
    super(
      `Payment of ${newAmount}${context} would exceed amount owed. Owed: ${amountOwed}, already paid: ${amountPaid}`,
    );
  }
}
