import { SubcontractorPayment } from 'src/generated/client';
import { SubcontractorPaymentResponseDto } from '../dto/subcontractor-payments-response.dto';

/**
 * Converts the given subcontractor payment to a subcontractor payment response DTO
 * @param subcontractorPayment The subcontractor payment from the database
 * @returns Subcontractor payment response DTO
 */
export const toSubcontractorPaymentResponse = (
  subcontractorPayment: SubcontractorPayment,
): SubcontractorPaymentResponseDto => ({
  ...subcontractorPayment,
  serviceDate: subcontractorPayment.serviceDate.toISOString(),
  paymentDate: subcontractorPayment.paymentDate.toISOString(),
  amount: subcontractorPayment.amount.toNumber(),
});

/**
 * Converts list of given subcontractor payments to list of subcontractor payment response DTOs
 * @param subcontractorPayments List of subcontractor payments from the database
 * @returns List of subcontractor payment response DTOs
 */
export const toSubcontractorPaymentResponseList = (
  subcontractorPayments: (SubcontractorPayment & { amount?: number })[],
): SubcontractorPaymentResponseDto[] =>
  subcontractorPayments.map((payment) =>
    toSubcontractorPaymentResponse(payment),
  );
