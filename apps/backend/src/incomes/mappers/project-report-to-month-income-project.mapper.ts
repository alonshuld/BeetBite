import { Prisma } from 'src/generated/client';
import { MonthIncomeProjectDto } from '../dto/month-income-project.dto';

export const projectReportToMonthIncomeProject = (
  report: {
    projectId: string;
    project: {
      name: string;
      estimatedAmount: { toNumber(): number };
      client: { name: string } | null;
    };
    incomeEntries: { amount: Prisma.Decimal; incomeDate: Date | null }[];
  },
  totalPaidIncome: number,
): MonthIncomeProjectDto => {
  const estimatedAmount = report.project.estimatedAmount.toNumber();
  const income = report.incomeEntries.reduce((sum, e) => sum + e.amount.toNumber(), 0);
  const allReceived = report.incomeEntries.length > 0 && report.incomeEntries.every((e) => e.incomeDate !== null);
  return {
    projectId: report.projectId,
    projectName: report.project.name,
    income,
    incomeStatus: allReceived ? 'paid' : 'pending',
    completionPercent:
      estimatedAmount > 0 ? (totalPaidIncome / estimatedAmount) * 100 : 0,
    clientName: report.project.client?.name ?? null,
  };
};
