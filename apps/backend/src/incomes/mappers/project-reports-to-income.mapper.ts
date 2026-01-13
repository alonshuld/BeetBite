import { Prisma } from 'src/generated/client';
import { IncomeResponseDto } from '../dto/income-response.dto';
import { ProjectIncomeDto } from '../dto/project-income.dto';
import { projectReportToProjectIncome } from './project-report-to-project-income.mapper';

type ProjectReportWithProject = Prisma.ProjectReportGetPayload<{
  include: { project: true };
}>;

/**
 * Converts project reports to income response DTO.
 * @param projectReports project reports with project details
 * @returns IncomeResponseDto containing total income, total profit, and project incomes
 */
export const projectReportsToIncome = (
  projectReports: ProjectReportWithProject[],
): IncomeResponseDto => {
  let totalIncome = 0;
  let totalProfit = 0;
  const projectIncomes: ProjectIncomeDto[] = [];

  for (const projectReport of projectReports) {
    const income = projectReport.income.toNumber();
    const profit =
      (projectReport.income.toNumber() *
        projectReport.profitMargin.toNumber()) /
      100;

    totalIncome += income;
    totalProfit += profit;

    projectIncomes.push(projectReportToProjectIncome(projectReport));
  }
  return {
    totalIncome,
    totalProfit,
    projectIncomes,
  };
};
