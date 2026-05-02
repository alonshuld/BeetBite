import { SubcontractorPayment } from 'src/generated/client';
import { SubcontractorPaymentResponseDto } from '../dto/subcontractor-payments-response.dto';

type SubcontractorPaymentWithSubcontractor = Omit<
  SubcontractorPayment,
  'subcontractorId'
> & {
  subcontractor: {
    id: string;
    name: string;
  };
};

/**
 * Converts a SubcontractorPayment entity to a SubcontractorPaymentResponseDto
 * @param subcontractorPayment SubcontractorPayment entity with related subcontractor data
 * @returns SubcontractorPaymentResponseDto with formatted dates and amount as number
 */
export const toSubcontractorPaymentResponse = (
  subcontractorPayment: SubcontractorPaymentWithSubcontractor,
): SubcontractorPaymentResponseDto => ({
  ...subcontractorPayment,
  serviceDate: subcontractorPayment.serviceDate.toISOString(),
  paymentDate: subcontractorPayment.paymentDate?.toISOString() ?? null,
  amount: subcontractorPayment.amount.toNumber(),
});
