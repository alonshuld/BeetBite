import {
  Corporation,
  CorporationPayment,
  Project,
  ProjectReport,
} from 'src/generated/client';
import { CorporationPaymentResponseDto } from '../dto/corporation-payment-response.dto';

/**
 * Converts a CorporationPayment entity with its related ProjectReport and Corporation to a CorporationPaymentResponseDto.
 * @param corporationPayment corporation payment entity with related project report and corporation details
 * @returns CorporationPaymentResponseDto containing payment details, project report, and corporation information
 */
export const toCorporationPaymentResponseDto = (
  corporationPayment: CorporationPayment & {
    projectReport: ProjectReport & {
      project: Project;
    };
    corporation: Corporation;
  },
): CorporationPaymentResponseDto => ({
  id: corporationPayment.id,
  amount: corporationPayment.amount.toNumber(),
  date: corporationPayment.date.toISOString(),
  projectReport: {
    id: corporationPayment.projectReport.id,
    projectId: corporationPayment.projectReport.projectId,
    projectName: corporationPayment.projectReport.project.name,
  },
  corporation: {
    ...corporationPayment.corporation,
  },
});
