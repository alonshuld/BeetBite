import {
  Corporation,
  CorporationPayment,
  Project,
  ProjectReport,
} from 'src/generated/client';
import { CorporationPaymentResponseDto } from '../dto/corporation-payment-response.dto';

type CorporationPaymentWithMinimalRelations = CorporationPayment & {
  projectReport: Pick<ProjectReport, 'id' | 'projectId'> & {
    project: Pick<Project, 'id' | 'name'>;
  };
  corporation: Pick<Corporation, 'id' | 'name'>;
};

/**
 * Converts a CorporationPayment entity with its related ProjectReport and Corporation to a CorporationPaymentResponseDto.
 * @param corporationPayment corporation payment entity with related project report and corporation details
 * @returns CorporationPaymentResponseDto containing payment details, project report, and corporation information
 */
export const toCorporationPaymentResponseDto = (
  corporationPayment: CorporationPaymentWithMinimalRelations,
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
    id: corporationPayment.corporation.id,
    name: corporationPayment.corporation.name,
  },
});
