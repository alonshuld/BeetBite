import {
  Corporation,
  CorporationPayment,
  Project,
  ProjectReport,
} from 'src/generated/client';
import { CorporationPaymentResponseDto } from '../dto/corporation-payment-response.dto';

/**
 * Converts a CorporationPayment entity with its related ProjectReport and Corporation to a CorporationPaymentResponseDto.
 * @param corporationPaymentFields corporation payment entity with related project report and corporation details
 * @returns CorporationPaymentResponseDto containing payment details, project report, and corporation information
 */
export const toCorporationPaymentResponseDto = (
  corporationPaymentFields: CorporationPayment & {
    projectReport: ProjectReport & {
      project: Project;
    };
    corporation: Corporation;
  },
): CorporationPaymentResponseDto => ({
  id: corporationPaymentFields.id,
  amount: corporationPaymentFields.amount.toNumber(),
  date: corporationPaymentFields.date.toISOString(),
  projectReport: {
    id: corporationPaymentFields.projectReport.id,
    projectId: corporationPaymentFields.projectReport.projectId,
    projectName: corporationPaymentFields.projectReport.project.name,
  },
  corporation: {
    id: corporationPaymentFields.corporation.id,
    name: corporationPaymentFields.corporation.name,
  },
});
