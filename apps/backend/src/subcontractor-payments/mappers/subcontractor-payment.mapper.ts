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

export const toSubcontractorPaymentResponse = (
  subcontractorPayment: SubcontractorPaymentWithSubcontractor,
): SubcontractorPaymentResponseDto => ({
  id: subcontractorPayment.id,
  projectId: subcontractorPayment.projectId,
  subcontractor: subcontractorPayment.subcontractor,
  serviceDate: subcontractorPayment.serviceDate.toISOString(),
  amount: subcontractorPayment.amount.toNumber(),
  isPaid: subcontractorPayment.isPaid,
});
