import { ProjectReport } from 'src/generated/client';
import { MonthIncomeProjectDto } from '../dto/month-income-project.dto';

export const projectReportToMonthIncomeProject = (
  report: ProjectReport & {
    project: {
      name: string;
      estimatedAmount: { toNumber(): number };
      client: { name: string } | null;
    };
  },
  totalPaidIncome: number,
): MonthIncomeProjectDto => {
  const estimatedAmount = report.project.estimatedAmount.toNumber();
  return {
    projectId: report.projectId,
    projectName: report.project.name,
    income: report.income.toNumber(),
    incomeStatus: report.incomeDate ? 'paid' : 'pending',
    completionPercent:
      estimatedAmount > 0 ? (totalPaidIncome / estimatedAmount) * 100 : 0,
    clientName: report.project.client?.name ?? null,
  };
};
