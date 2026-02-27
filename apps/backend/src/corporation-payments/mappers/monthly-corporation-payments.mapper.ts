import { Prisma } from 'src/generated/client';
import { MonthlyCorporationPaymentsResponseDto } from '../dto/monthly-corporation-payments-response.dto';
import { MultipleMonthlyCorporationPaymentsResponseDto } from '../dto/multiple-monthly-corporation-payments-response.dto';

type CorporationWithPayments = Prisma.CorporationGetPayload<{
  select: {
    id: true;
    name: true;
    payments: {
      select: {
        id: true;
        amount: true;
        date: true;
        projectReport: {
          select: {
            id: true;
            project: {
              select: {
                id: true;
                name: true;
              };
            };
          };
        };
      };
    };
  };
}>;

/**
 * Converts an array of CorporationPayment entities into a CorporationPaymentsResponseDto.
 * @param payments List of CorporationPayment entities with related Corporation and ProjectReport data
 * @returns CorporationPaymentsResponseDto containing the corporation's payments and related information
 */
export const toMonthlyCorporationPaymentsResponse = (
  corporation: CorporationWithPayments,
): MonthlyCorporationPaymentsResponseDto => {
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

  return {
    corporation: {
      id: corporation.id,
      name: corporation.name,
    },
    projectPayments,
    total: projectPayments.reduce((sum, p) => sum + p.amount, 0),
  };
};

/**
 * Converts an array of CorporationPayment entities into an array of CorporationPaymentsResponseDto, grouped by corporation.
 * @param payments The payments made to a specific corporation in a month
 * @returns List of CorporationPaymentsResponseDto, each containing the corporation's payments and related information
 */
export const toMultipleMonthlyCorporationsPaymentsResponse = (
  corporations: CorporationWithPayments[],
): MultipleMonthlyCorporationPaymentsResponseDto => {
  const corporationsPayments = corporations.map(
    toMonthlyCorporationPaymentsResponse,
  );

  return {
    corporationsPayments,
    total: corporationsPayments.reduce((sum, corp) => sum + corp.total, 0),
  };
};
