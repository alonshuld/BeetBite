import { Prisma } from 'src/generated/client';
import { MonthlySupplierPaymentsResponseDto } from '../dto/monthly-supplier-payments-response.dto';
import { MultipleMonthlySupplierPaymentsResponseDto } from '../dto/multiple-monthly-supplier-payments-response.dto';

type SupplierWithPayments = Prisma.SupplierGetPayload<{
  select: {
    id: true;
    name: true;
    payments: {
      select: {
        id: true;
        amount: true;
        date: true;
        vatPercentage: true;
        isFuture: true;
        description: true;
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
 * Converts a SupplierPayment entity into a MonthlySupplierPaymentsResponseDto.
 * @param supplier Supplier with its related payments and project report data
 * @returns MonthlySupplierPaymentsResponseDto containing the payments and related information for a single supplier, along with the total amount for that supplier
 */
export const toMonthlySupplierPaymentsResponse = (
  supplier: SupplierWithPayments,
): MonthlySupplierPaymentsResponseDto => {
  const projectPayments = supplier.payments.map((payment) => {
    const amount = payment.amount.toNumber();
    const vatPercentage = payment.vatPercentage?.toNumber() ?? null;
    const vatAmount = vatPercentage ? amount * (vatPercentage / 100) : 0;
    return {
      id: payment.id,
      projectReport: {
        id: payment.projectReport.id,
        projectId: payment.projectReport.project.id,
        projectName: payment.projectReport.project.name,
      },
      amount,
      date: payment.date?.toISOString() ?? null,
      vatPercentage,
      vatAmount,
      effectiveTotal: amount + vatAmount,
      isFuture: payment.isFuture,
      description: payment.description,
    };
  });

  return {
    supplier: {
      id: supplier.id,
      name: supplier.name,
    },
    projectPayments,
    total: projectPayments.reduce((sum, p) => sum + p.amount, 0),
  };
};

/**
 * Converts an array of SupplierPayment entities into a MultipleSupplierPaymentsResponseDto.
 * @param suppliers Suppliers with their related payments and project report data
 * @returns MultipleSupplierPaymentsResponseDto containing the payments and related information for multiple suppliers, along with the total amount across all suppliers
 */
export const toMultipleMonthlySuppliersPaymentsResponse = (
  suppliers: SupplierWithPayments[],
): MultipleMonthlySupplierPaymentsResponseDto => {
  const suppliersPayments = suppliers.map(toMonthlySupplierPaymentsResponse);

  return {
    suppliersPayments,
    total: suppliersPayments.reduce((sum, corp) => sum + corp.total, 0),
  };
};
