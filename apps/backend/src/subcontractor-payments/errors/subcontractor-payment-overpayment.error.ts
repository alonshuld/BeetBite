import { BadRequestException } from '@nestjs/common';

import type { CodedError, ErrorParams } from '../../common/errors/coded-error';

export class SubcontractorPaymentOverpaymentError
  extends BadRequestException
  implements CodedError
{
  readonly code = 'SUBCONTRACTOR_PAYMENT_OVERPAYMENT';
  readonly params: ErrorParams;

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
    this.params = { amount: newAmount, owed: amountOwed, paid: amountPaid };
  }
}
