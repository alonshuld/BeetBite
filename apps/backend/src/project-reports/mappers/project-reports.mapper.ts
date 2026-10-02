import { Prisma, ProjectReport } from 'src/generated/client';
import { ProjectReportListItemDto } from '../dto/project-report-list-item.dto';
import { ProjectReportResponseDto } from '../dto/project-report-response.dto';
import { IncomeEntryResponseDto } from '../dto/income-entry-response.dto';
import {
  VatRateEntry,
  derivePaymentVat,
} from 'src/vat-rates/utils/payment-vat';

type IncomeEntryRaw = {
  id: string;
  amount: Prisma.Decimal;
  incomeDate: Date | null;
  tag: string | null;
};

type SupplierPaymentRaw = {
  id: string;
  amount: Prisma.Decimal;
  includesVat: boolean;
  supplier: { id: string; name: string };
};

export function mapIncomeEntries(
  entries: IncomeEntryRaw[],
): IncomeEntryResponseDto[] {
  return entries.map((e) => ({
    id: e.id,
    amount: e.amount.toNumber(),
    incomeDate: e.incomeDate?.toISOString() ?? null,
    tag: e.tag,
  }));
}

function sumIncomeEntries(entries: IncomeEntryRaw[]): number {
  return entries.reduce((sum, e) => sum + e.amount.toNumber(), 0);
}

type ProjectWithClientRaw = {
  id: string;
  name: string;
  description: string;
  location: string;
  requesterName: string;
  initiatorName: string | null;
  client: { id: string; name: string };
};

export const toProjectReportListItem = (
  projectReport: Omit<ProjectReport, 'income' | 'incomeDate'> & {
    project: ProjectWithClientRaw;
    subcontractor: { id: string; name: string };
    incomeEntries: IncomeEntryRaw[];
    supplierPayments: SupplierPaymentRaw[];
  },
  vatRates: VatRateEntry[],
): ProjectReportListItemDto => {
  const entries = mapIncomeEntries(projectReport.incomeEntries);
  return {
    id: projectReport.id,
    project: projectReport.project,
    subcontractor: projectReport.subcontractor,
    date: projectReport.date.toISOString(),
    profitMargin: projectReport.profitMargin.toNumber(),
    totalIncome: sumIncomeEntries(projectReport.incomeEntries),
    incomeEntries: entries,
    supplierPayments: projectReport.supplierPayments.map((cp) => {
      const amount = cp.amount.toNumber();
      // VAT is looked up for the report's own month, never stored on the payment.
      const { vatPercentage, vatAmount, effectiveTotal } = derivePaymentVat(
        amount,
        cp.includesVat,
        vatRates,
        projectReport.date,
      );
      return {
        id: cp.id,
        amount,
        includesVat: cp.includesVat,
        vatPercentage,
        vatAmount,
        effectiveTotal,
        supplier: cp.supplier,
      };
    }),
    initiatorIncome: projectReport.initiatorIncome?.toNumber() ?? null,
  };
};

export const toProjectReportList = (
  projectReports: (Omit<ProjectReport, 'income' | 'incomeDate'> & {
    project: ProjectWithClientRaw;
    subcontractor: { id: string; name: string };
    incomeEntries: IncomeEntryRaw[];
    supplierPayments: SupplierPaymentRaw[];
  })[],
  vatRates: VatRateEntry[],
): ProjectReportListItemDto[] =>
  projectReports.map((projectReport) =>
    toProjectReportListItem(projectReport, vatRates),
  );

export const toProjectReportResponse = (
  projectReport: Omit<ProjectReport, 'income' | 'incomeDate'> & {
    project: {
      id: string;
      name: string;
      description: string;
      location: string;
      requesterName: string;
      initiatorName: string | null;
    };
    subcontractor: {
      id: string;
      name: string;
      payments: { id: string }[];
    };
    supplierPayments: SupplierPaymentRaw[];
    incomeEntries: IncomeEntryRaw[];
  },
  profit: number,
  subcontractorPayment: number,
): ProjectReportResponseDto => ({
  id: projectReport.id,
  project: projectReport.project,
  date: projectReport.date.toISOString(),
  profitMargin: projectReport.profitMargin.toNumber(),
  profit,
  totalIncome: sumIncomeEntries(projectReport.incomeEntries),
  incomeEntries: mapIncomeEntries(projectReport.incomeEntries),
  subcontractor: {
    id: projectReport.subcontractor.id,
    name: projectReport.subcontractor.name,
    payment: subcontractorPayment,
  },
  supplierPayments: projectReport.supplierPayments.map((cp) => ({
    id: cp.id,
    amount: cp.amount.toNumber(),
    supplier: cp.supplier,
  })),
  initiatorIncome: projectReport.initiatorIncome?.toNumber() ?? null,
});
