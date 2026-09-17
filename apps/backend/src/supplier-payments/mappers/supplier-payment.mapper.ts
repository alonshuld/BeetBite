import {
  Supplier,
  SupplierPayment,
  Project,
  ProjectReport,
} from 'src/generated/client';
import { SupplierPaymentResponseDto } from '../dto/supplier-payment-response.dto';

type SupplierPaymentWithMinimalRelations = Pick<
  SupplierPayment,
  'id' | 'amount' | 'date' | 'description' | 'isFuture' | 'vatPercentage'
> & {
  projectReport: Pick<ProjectReport, 'id' | 'projectId'> & {
    project: Pick<Project, 'id' | 'name'>;
  };
  supplier: Pick<Supplier, 'id' | 'name'>;
};

/**
 * Converts a SupplierPayment entity with its related ProjectReport and Supplier to a SupplierPaymentResponseDto.
 * @param supplierPayment supplier payment entity with related project report and supplier details
 * @returns SupplierPaymentResponseDto containing payment details, project report, and supplier information
 */
export const toSupplierPaymentResponseDto = (
  supplierPayment: SupplierPaymentWithMinimalRelations,
): SupplierPaymentResponseDto => {
  const amount = supplierPayment.amount.toNumber();
  const vatPercentage = supplierPayment.vatPercentage?.toNumber() ?? null;
  const vatAmount = vatPercentage ? amount * (vatPercentage / 100) : 0;
  const effectiveTotal = amount + vatAmount;

  return {
    id: supplierPayment.id,
    amount,
    date: supplierPayment.date?.toISOString() ?? null,
    description: supplierPayment.description,
    isFuture: supplierPayment.isFuture,
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
