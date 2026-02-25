import {
  Corporation,
  CorporationPayment,
  Project,
  ProjectReport,
} from 'src/generated/client';
import { MonthlyCorporationPaymentsResponseDto } from '../dto/monthly-corporation-payments-response.dto';
import { MultipleMonthlyCorporationPaymentsResponseDto } from '../dto/multiple-monthly-corporation-payments-response.dto';

/**
 * Converts an array of CorporationPayment entities into a CorporationPaymentsResponseDto.
 * @param payments List of CorporationPayment entities with related Corporation and ProjectReport data
 * @returns CorporationPaymentsResponseDto containing the corporation's payments and related information
 */
export const toCorporationPaymentsResponse = (
  payments: (CorporationPayment & {
    corporation: Corporation;
    projectReport: ProjectReport & {
      project: Project;
    };
  })[],
): MonthlyCorporationPaymentsResponseDto => {
  if (payments.length === 0) {
    return {
      id: '',
      corporation: {
        id: '',
        name: '',
      },
      projectPayments: [],
      total: 0,
    } as MonthlyCorporationPaymentsResponseDto;
  }

  const corporation = payments[0].corporation;

  const projectPayments = payments.map((payment) => ({
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
    projectPayments,
    total,
  };
};

/**
 * Converts an array of CorporationPayment entities into an array of CorporationPaymentsResponseDto, grouped by corporation.
 * @param payments List of CorporationPayment entities with related Corporation and ProjectReport data
 * @returns List of CorporationPaymentsResponseDto, each containing the corporation's payments and related information
 */
export const toCorporationsPaymentsResponse = (
  payments: (CorporationPayment & {
    corporation: Corporation;
    projectReport: ProjectReport & {
      project: Project;
    };
  })[],
): MultipleMonthlyCorporationPaymentsResponseDto => {
  const paymentsByCorporation = payments.reduce(
    (acc, payment) => {
      const corporationId = payment.corporation.id;
      if (!acc[corporationId]) {
        acc[corporationId] = [];
      }
      acc[corporationId].push(payment);
      return acc;
    },
    {} as Record<string, typeof payments>,
  );

  return {
    corporationsPayments: Object.values(paymentsByCorporation).map(
      toCorporationPaymentsResponse,
    ),
    total: payments.reduce(
      (sum, payment) => sum + payment.amount.toNumber(),
      0,
    ),
  };
};
