import { CorporationPayment } from 'src/generated/client';
import { CorporationPaymentResponseDto } from '../dto/corporation-payment-response.dto';

export const toCorporationPaymentResponse = (
  corporationPayment: CorporationPayment & {
    corporation: { id: string; name: string };
    projectReport: { id: string; project: { id: string; name: string } };
  },
): CorporationPaymentResponseDto => ({
  id: corporationPayment.id,
  corporation: {
    id: corporationPayment.corporation.id,
    name: corporationPayment.corporation.name,
  },
  projectPayment: {
    id: corporationPayment.projectReport.id,
    projectReport: {
      id: corporationPayment.projectReport.project.id,
      projectId: corporationPayment.projectReport.project.name,
    },
    amount: corporationPayment.projectReport.amount.toNumber(),
    date: corporationPayment.projectReport.date.toISOString(),
  },
  total:
});
