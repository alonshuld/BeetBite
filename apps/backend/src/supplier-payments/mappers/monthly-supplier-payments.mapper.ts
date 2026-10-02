import { Prisma } from 'src/generated/client';
import { MonthlySupplierPaymentsResponseDto } from '../dto/monthly-supplier-payments-response.dto';
import { MultipleMonthlySupplierPaymentsResponseDto } from '../dto/multiple-monthly-supplier-payments-response.dto';
import {
  VatRateEntry,
  derivePaymentVat,
} from 'src/vat-rates/utils/payment-vat';

type SupplierWithPayments = Prisma.SupplierGetPayload<{
  select: {
    id: true;
    name: true;
    payments: {
      select: {
        id: true;
        amount: true;
        date: true;
        includesVat: true;
        isFuture: true;
        description: true;
        isPaid: true;
        projectReport: {
          select: {
            id: true;
            date: true;
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
 * @param vatRates The full VAT rate history, used to derive each payment's VAT for its report's month
 * @returns MonthlySupplierPaymentsResponseDto containing the payments and related information for a single supplier, along with the total amount for that supplier
 */
export const toMonthlySupplierPaymentsResponse = (
  supplier: SupplierWithPayments,
  vatRates: VatRateEntry[],
): MonthlySupplierPaymentsResponseDto => {
  const projectPayments = supplier.payments.map((payment) => {
    const amount = payment.amount.toNumber();
    const { vatPercentage, vatAmount, effectiveTotal } = derivePaymentVat(
      amount,
      payment.includesVat,
      vatRates,
      payment.projectReport.date,
    );
    return {
      id: payment.id,
      projectReport: {
        id: payment.projectReport.id,
        projectId: payment.projectReport.project.id,
        projectName: payment.projectReport.project.name,
      },
      amount,
      date: payment.date?.toISOString() ?? null,
      includesVat: payment.includesVat,
      vatPercentage,
      vatAmount,
      effectiveTotal,
      isFuture: payment.isFuture,
      description: payment.description,
      isPaid: payment.isPaid,
    };
  });

  return {
    supplier: {
      id: supplier.id,
      name: supplier.name,
    },
    projectPayments,
    total: projectPayments.reduce((sum, p) => sum + p.amount, 0),
    // "₪12,000 of ₪18,000 paid" — what is still outstanding with this supplier
    // is the number the contractor acts on.
    totalPaid: projectPayments
      .filter((p) => p.isPaid)
      .reduce((sum, p) => sum + p.amount, 0),
  };
};

/**
 * Converts an array of SupplierPayment entities into a MultipleSupplierPaymentsResponseDto.
 * @param suppliers Suppliers with their related payments and project report data
 * @param vatRates The full VAT rate history, used to derive each payment's VAT for its report's month
 * @returns MultipleSupplierPaymentsResponseDto containing the payments and related information for multiple suppliers, along with the total amount across all suppliers
 */
export const toMultipleMonthlySuppliersPaymentsResponse = (
  suppliers: SupplierWithPayments[],
  vatRates: VatRateEntry[],
): MultipleMonthlySupplierPaymentsResponseDto => {
  const suppliersPayments = suppliers.map((supplier) =>
    toMonthlySupplierPaymentsResponse(supplier, vatRates),
  );

  return {
    suppliersPayments,
    total: suppliersPayments.reduce((sum, corp) => sum + corp.total, 0),
  };
};
