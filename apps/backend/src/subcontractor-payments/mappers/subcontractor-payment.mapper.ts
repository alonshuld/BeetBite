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
  ...subcontractorPayment,
  serviceDate: subcontractorPayment.serviceDate.toISOString(),
  amount: subcontractorPayment.amount.toNumber(),
});
