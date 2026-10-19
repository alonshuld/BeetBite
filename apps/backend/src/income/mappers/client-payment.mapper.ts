import { ClientPayment } from 'src/generated/client';
import { ClientPaymentResponseDto } from '../dto/client-payment-response.dto';

export const toClientPaymentResponse = (
  payment: Pick<
    ClientPayment,
    'id' | 'projectReportId' | 'amount' | 'paymentDate'
  >,
): ClientPaymentResponseDto => ({
  id: payment.id,
  projectReportId: payment.projectReportId,
  amount: payment.amount.toNumber(),
  paymentDate: payment.paymentDate.toISOString(),
});
