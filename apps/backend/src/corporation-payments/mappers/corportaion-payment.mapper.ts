import {
  Corporation,
  CorporationPayment,
  ProjectReport,
} from 'src/generated/client';
import { CorporationPaymentResponseDto } from '../dto/corporation-payment-response.dto';

export const toCorporationPaymentDto = (
  corporationPaymentFields: CorporationPayment & ProjectReport & Corporation,
): CorporationPaymentResponseDto => ({
  id: corporationPaymentFields.id,
  amount: corporationPaymentFields.amount.toNumber(),
  date: corporationPaymentFields.date.toISOString(),
  projectReport: {
    id: corporationPaymentFields.projectReportId,
    projectId: corporationPaymentFields.projectId,
    name: corporationPaymentFields.name,
  },
});
