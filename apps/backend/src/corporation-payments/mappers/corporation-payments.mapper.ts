import {
  Corporation,
  CorporationPayment,
  Project,
  ProjectReport,
} from 'src/generated/client';
import { CorporationPaymentsResponseDto } from '../dto/corporation-payments-response.dto';

/**
 * Maps a Corporation with its payments and related project reports to a CorporationPaymentsResponseDto.
 * @param corporation Corporation entity with payments and related project reports
 * @returns CorporationPaymentsResponseDto containing corporation details, project payments, and total amount
 */
export const toCorporationPaymentResponse = (
  corporation: Corporation & {
    payments: (CorporationPayment & {
      projectReport: ProjectReport & {
        project: Project;
      };
    })[];
  },
): CorporationPaymentsResponseDto => {
  const projectPayments = corporation.payments.map((payment) => ({
    id: payment.id,
    projectReport: {
      id: payment.projectReport.id,
      projectId: payment.projectReport.project.id,
      projectName: payment.projectReport.project.name,
    },
    amount: payment.amount.toNumber(),
    date: payment.date.toISOString(),
  }));

  const total = projectPayments.reduce((sum, p) => sum + p.amount, 0);

  return {
    id: corporation.id,
    corporation: {
      id: corporation.id,
      name: corporation.name,
    },
    projectPayments: projectPayments,
    total: total,
  };
};
