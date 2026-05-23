import { ProjectIncomeDto } from '../dto/project-income.dto';
import { Prisma } from 'src/generated/client';

export const projectReportToProjectIncome = (projectReport: {
  projectId: string;
  profitMargin: Prisma.Decimal;
  project: { name: string };
  incomeEntries: { amount: Prisma.Decimal }[];
}): ProjectIncomeDto => {
  const income = projectReport.incomeEntries.reduce(
    (sum, e) => sum + e.amount.toNumber(),
    0,
  );
  const profitMargin = projectReport.profitMargin.toNumber();
  return {
    projectId: projectReport.projectId,
    projectName: projectReport.project.name,
    income,
    profitMargin,
    profit: (income * profitMargin) / 100,
  };
};
