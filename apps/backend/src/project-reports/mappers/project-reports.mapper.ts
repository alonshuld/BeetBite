import { Prisma, ProjectReport } from 'src/generated/client';
import { ProjectReportListItemDto } from '../dto/project-report-list-item.dto';
import { ProjectReportResponseDto } from '../dto/project-report-response.dto';
import { IncomeEntryResponseDto } from '../dto/income-entry-response.dto';

type IncomeEntryRaw = {
  id: string;
  amount: Prisma.Decimal;
  incomeDate: Date | null;
  tag: string | null;
};

type SupplierPaymentRaw = {
  id: string;
  amount: Prisma.Decimal;
  vatPercentage: Prisma.Decimal | null;
  supplier: { id: string; name: string };
};

function mapIncomeEntries(entries: IncomeEntryRaw[]): IncomeEntryResponseDto[] {
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

export const toProjectReportListItem = (
  projectReport: Omit<ProjectReport, 'income' | 'incomeDate'> & {
    project: { id: string; name: string; client: { id: string; name: string } };
    subcontractor: { id: string; name: string };
    incomeEntries: IncomeEntryRaw[];
    supplierPayments: SupplierPaymentRaw[];
  },
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
      const vatPercentage = cp.vatPercentage?.toNumber() ?? null;
      const vatAmount = vatPercentage ? amount * (vatPercentage / 100) : 0;
      return {
        id: cp.id,
        amount,
        vatPercentage,
        vatAmount,
        effectiveTotal: amount + vatAmount,
        supplier: cp.supplier,
      };
    }),
  };
};

export const toProjectReportList = (
  projectReports: (Omit<ProjectReport, 'income' | 'incomeDate'> & {
    project: { id: string; name: string; client: { id: string; name: string } };
    subcontractor: { id: string; name: string };
    incomeEntries: IncomeEntryRaw[];
    supplierPayments: SupplierPaymentRaw[];
  })[],
): ProjectReportListItemDto[] => projectReports.map(toProjectReportListItem);

export const toProjectReportResponse = (
  projectReport: Omit<ProjectReport, 'income' | 'incomeDate'> & {
    project: { id: string; name: string };
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
});
