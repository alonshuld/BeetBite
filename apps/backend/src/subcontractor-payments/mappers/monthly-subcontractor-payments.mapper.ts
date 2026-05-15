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
        amount: true;
      };
    };
  };
}> & { expectedTotal: number; serviceDate: Date };

export const toMonthlySubcontractorPaymentsResponse = (
  subcontractorWithPayments: SubcontractorWithPayments,
): MonthlySubcontractorPaymentsDto => {
  const amountPaid = subcontractorWithPayments.payments.reduce(
    (sum, payment) => sum + payment.amount.toNumber(),
    0,
  );

  return {
    subcontractor: {
      id: subcontractorWithPayments.id,
      name: subcontractorWithPayments.name,
    },
    serviceDate: subcontractorWithPayments.serviceDate.toISOString(),
    amountOwed: subcontractorWithPayments.expectedTotal,
    amountPaid,
    payments: subcontractorWithPayments.payments.map((payment) => ({
      id: payment.id,
      amount: payment.amount.toNumber(),
    })),
  };
};

export const toMonthlySubcontractorPaymentsResponseList = (
  subcontractorsWithPayments: SubcontractorWithPayments[],
): MonthlySubcontractorPaymentsDto[] => {
  return subcontractorsWithPayments.map((subcontractor) =>
    toMonthlySubcontractorPaymentsResponse(subcontractor),
  );
};
