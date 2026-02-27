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
 * Converts a CorporationPayment entity into a MonthlyCorporationPaymentsResponseDto.
 * @param corporation Corporation with its related payments and project report data
 * @returns MonthlyCorporationPaymentsResponseDto containing the payments and related information for a single corporation, along with the total amount for that corporation
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
 * Converts an array of CorporationPayment entities into a MultipleCorporationPaymentsResponseDto.
 * @param corporations Corporations with their related payments and project report data
 * @returns MultipleCorporationPaymentsResponseDto containing the payments and related information for multiple corporations, along with the total amount across all corporations
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
