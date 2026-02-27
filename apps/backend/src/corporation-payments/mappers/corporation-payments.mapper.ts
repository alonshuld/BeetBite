import {
  Corporation,
  CorporationPayment,
  Project,
  ProjectReport,
} from 'src/generated/client';
import { MonthlyCorporationPaymentsResponseDto } from '../dto/monthly-corporation-payments-response.dto';
import { MultipleMonthlyCorporationPaymentsResponseDto } from '../dto/multiple-monthly-corporation-payments-response.dto';

type CorporationPaymentWithMinimalRelations = Pick<
  CorporationPayment,
  'id' | 'amount' | 'date'
> & {
  projectReport: Pick<ProjectReport, 'id'> & {
    project: Pick<Project, 'id' | 'name'>;
  };
  corporation: Pick<Corporation, 'id' | 'name'>;
};

/**
 * Converts an array of CorporationPayment entities into a CorporationPaymentsResponseDto.
 * @param payments List of CorporationPayment entities with related Corporation and ProjectReport data
 * @returns CorporationPaymentsResponseDto containing the corporation's payments and related information
 */
export const toCorporationPaymentsResponse = (
  payments: CorporationPaymentWithMinimalRelations[],
  corporation: Pick<Corporation, 'id' | 'name'>,
): MonthlyCorporationPaymentsResponseDto => {
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
    corporation: {
      ...corporation,
    },
    projectPayments,
    total,
  };
};

/**
 * Converts an array of CorporationPayment entities into an array of CorporationPaymentsResponseDto, grouped by corporation.
 * @param payments The payments made to a specific corporation in a month
 * @returns List of CorporationPaymentsResponseDto, each containing the corporation's payments and related information
 */
export const toCorporationsPaymentsResponse = (
  payments: CorporationPaymentWithMinimalRelations[],
): MultipleMonthlyCorporationPaymentsResponseDto => {
  const grouped = payments.reduce((map, payment) => {
    const key = payment.corporation.id;

    if (!map.has(key)) {
      map.set(key, []);
    }

    map.get(key)!.push(payment);
    return map;
  }, new Map<string, CorporationPaymentWithMinimalRelations[]>());

  const corporationsPayments = [...grouped.values()].map((payments) =>
    toCorporationPaymentsResponse(payments, payments[0].corporation),
  );

  return {
    corporationsPayments,
    total: corporationsPayments.reduce((sum, corp) => sum + corp.total, 0),
  };
};
