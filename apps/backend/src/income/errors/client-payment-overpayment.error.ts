import { BadRequestException } from '@nestjs/common';

import type { CodedError, ErrorParams } from '../../common/errors/coded-error';

/**
 * Thrown when a client payment would bring the month's payments above what the
 * client owes for it — the income, plus VAT when the report carries VAT.
 */
export class ClientPaymentOverpaymentError
  extends BadRequestException
  implements CodedError
{
  readonly code = 'CLIENT_PAYMENT_OVERPAYMENT';
  readonly params: ErrorParams;

  constructor(
    amountOwed: number,
    amountPaid: number,
    newAmount: number,
    paymentId?: string,
  ) {
    const context = paymentId ? ` (payment ID: ${paymentId})` : '';
    super(
      `Client payment of ${newAmount}${context} would exceed the amount owed. Owed: ${amountOwed}, already paid: ${amountPaid}`,
    );
    this.params = { amount: newAmount, owed: amountOwed, paid: amountPaid };
  }
}
