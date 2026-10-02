import {
  Supplier,
  SupplierPayment,
  Project,
  ProjectReport,
} from 'src/generated/client';
import { SupplierPaymentResponseDto } from '../dto/supplier-payment-response.dto';
import {
  VatRateEntry,
  derivePaymentVat,
} from 'src/vat-rates/utils/payment-vat';

type SupplierPaymentWithMinimalRelations = Pick<
  SupplierPayment,
  'id' | 'amount' | 'date' | 'description' | 'isFuture' | 'includesVat'
> & {
  projectReport: Pick<ProjectReport, 'id' | 'projectId' | 'date'> & {
    project: Pick<Project, 'id' | 'name'>;
  };
  supplier: Pick<Supplier, 'id' | 'name'>;
};

/**
 * Converts a SupplierPayment entity with its related ProjectReport and Supplier to a SupplierPaymentResponseDto.
 * @param supplierPayment supplier payment entity with related project report and supplier details
 * @param vatRates The full VAT rate history, used to derive the payment's VAT for its report's month
 * @returns SupplierPaymentResponseDto containing payment details, project report, and supplier information
 */
export const toSupplierPaymentResponseDto = (
  supplierPayment: SupplierPaymentWithMinimalRelations,
  vatRates: VatRateEntry[],
): SupplierPaymentResponseDto => {
  const amount = supplierPayment.amount.toNumber();
  const { vatPercentage, vatAmount, effectiveTotal } = derivePaymentVat(
    amount,
    supplierPayment.includesVat,
    vatRates,
    supplierPayment.projectReport.date,
  );

  return {
    id: supplierPayment.id,
    amount,
    date: supplierPayment.date?.toISOString() ?? null,
    description: supplierPayment.description,
    isFuture: supplierPayment.isFuture,
    includesVat: supplierPayment.includesVat,
    vatPercentage,
    vatAmount,
    effectiveTotal,
    projectReport: {
      id: supplierPayment.projectReport.id,
      projectId: supplierPayment.projectReport.projectId,
      projectName: supplierPayment.projectReport.project.name,
    },
    supplier: {
      id: supplierPayment.supplier.id,
      name: supplierPayment.supplier.name,
    },
  };
};
