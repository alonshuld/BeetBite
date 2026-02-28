import { Prisma } from 'src/generated/client';
import { MonthlySubcontractorPaymentsDto } from '../dto/monthly-subcontractor-payments.dto';

type SubcontractorWithPayments = Prisma.SubcontractorGetPayload<{
  select: {
    id: true;
    name: true;
    payments: {
      select: {
        id: true;
        serviceDate: true;
        paymentDate: true;
        amount: true;
      };
    };
  };
}> & { expectedTotal: number };

/**
 * Converts a Subcontractor with its associated payments into a MonthlySubcontractorPaymentsDto for API response.
 * @param subcontractorWithPayments Subcontractor data including its payments retrieved from the database
 * @returns MonthlySubcontractorPaymentsDto formatted for API response, containing subcontractor details and a list of payments
 */
export const toMonthlySubcontractorPaymentsResponse = (
  subcontractorWithPayments: SubcontractorWithPayments,
): MonthlySubcontractorPaymentsDto => {
  return {
    subcontractor: {
      id: subcontractorWithPayments.id,
      name: subcontractorWithPayments.name,
    },
    payments: subcontractorWithPayments.payments.map((payment) => ({
      id: payment.id,
      serviceDate: payment.serviceDate.toISOString(),
      paymentDate: payment.paymentDate.toISOString(),
      amount: payment.amount.toNumber(),
    })),
    total: subcontractorWithPayments.payments.reduce(
      (sum, payment) => sum + payment.amount.toNumber(),
      0,
    ),
    expectedTotal: subcontractorWithPayments.expectedTotal,
  };
};

/**
 * Converts a list of Subcontractors with their associated payments into a list of MonthlySubcontractorPaymentsDto for API response.
 * @param subcontractorsWithPayments Subcontractor data including their payments retrieved from the database
 * @returns List of MonthlySubcontractorPaymentsDto formatted for API response, containing subcontractor details and a list of payments for each subcontractor
 */
export const toMonthlySubcontractorPaymentsResponseList = (
  subcontractorsWithPayments: SubcontractorWithPayments[],
): MonthlySubcontractorPaymentsDto[] => {
  return subcontractorsWithPayments.map((subcontractor) =>
    toMonthlySubcontractorPaymentsResponse(subcontractor),
  );
};
