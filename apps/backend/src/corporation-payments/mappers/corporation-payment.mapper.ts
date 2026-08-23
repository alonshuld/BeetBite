import {
  Corporation,
  CorporationPayment,
  Project,
  ProjectReport,
} from 'src/generated/client';
import { CorporationPaymentResponseDto } from '../dto/corporation-payment-response.dto';

type CorporationPaymentWithMinimalRelations = Pick<
  CorporationPayment,
  'id' | 'amount' | 'date' | 'description' | 'isFuture' | 'vatPercentage'
> & {
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
): CorporationPaymentResponseDto => {
  const amount = corporationPayment.amount.toNumber();
  const vatPercentage = corporationPayment.vatPercentage?.toNumber() ?? null;
  const vatAmount = vatPercentage ? amount * (vatPercentage / 100) : 0;
  const effectiveTotal = amount + vatAmount;

  return {
    id: corporationPayment.id,
    amount,
    date: corporationPayment.date?.toISOString() ?? null,
    description: corporationPayment.description,
    isFuture: corporationPayment.isFuture,
    vatPercentage,
    vatAmount,
    effectiveTotal,
    projectReport: {
      id: corporationPayment.projectReport.id,
      projectId: corporationPayment.projectReport.projectId,
      projectName: corporationPayment.projectReport.project.name,
    },
    corporation: {
      id: corporationPayment.corporation.id,
      name: corporationPayment.corporation.name,
    },
  };
};
