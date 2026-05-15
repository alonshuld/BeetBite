import { Prisma, ProjectReport } from 'src/generated/client';
import { ProjectReportListItemDto } from '../dto/project-report-list-item.dto';
import { ProjectReportResponseDto } from '../dto/project-report-response.dto';

/**
 * Converts the given project report to a project report list item DTO
 * @param projectReport The project report from the database that contains embedded project and
 * subcontractor information.
 * @returns A project report list item DTO.
 */
export const toProjectReportListItem = (
  projectReport: ProjectReport & {
    project: { id: string; name: string };
    subcontractor: { id: string; name: string };
  },
): ProjectReportListItemDto => ({
  id: projectReport.id,
  project: projectReport.project,
  subcontractor: projectReport.subcontractor,
  date: projectReport.date.toISOString(),
  profitMargin: projectReport.profitMargin.toNumber(),
  income: projectReport.income.toNumber(),
  incomeDate: projectReport.incomeDate?.toISOString(),
});

/**
 * Converts the given list of project reports to a project report list item DTOs list.
 * @param projectReports The project reports list from the database that contains embedded project and
 * subcontractor information.
 * @returns A project report list item DTO list.
 */
export const toProjectReportList = (
  projectReports: (ProjectReport & {
    project: { id: string; name: string };
    subcontractor: { id: string; name: string };
  })[],
): ProjectReportListItemDto[] => projectReports.map(toProjectReportListItem);

/**
 * Converts the given project report to a project report response DTO with enriched fields.
 * @param projectReport The project report from the database that contains embedded relationship parameters.
 * @param profit The calculated profit for the project report.
 * @param subcontractorPayment The calculated amount the subcontractor is owed for their work.
 * @returns A project report response DTO.
 */
export const toProjectReportResponse = (
  projectReport: ProjectReport & {
    project: { id: string; name: string };
    subcontractor: {
      id: string;
      name: string;
      payments: { paymentDate: Date | null }[];
    };
    corporationPayments: {
      id: string;
      amount: Prisma.Decimal;
      corporation: { id: string; name: string };
    }[];
  },
  profit: number,
  subcontractorPayment: number,
): ProjectReportResponseDto => ({
  id: projectReport.id,
  project: projectReport.project,
  date: projectReport.date.toISOString(),
  profitMargin: projectReport.profitMargin.toNumber(),
  profit,
  income: projectReport.income.toNumber(),
  incomeDate: projectReport.incomeDate?.toISOString(),
  subcontractor: {
    id: projectReport.subcontractor.id,
    name: projectReport.subcontractor.name,
    payment: subcontractorPayment,
    paymentDate: projectReport.subcontractor.payments
      .map((p) => p.paymentDate)
      .filter((d): d is Date => d !== null)
      .sort((a, b) => b.getTime() - a.getTime())[0]
      ?.toISOString(),
  },
  corporationPayments: projectReport.corporationPayments.map(
    (corporationPay) => ({
      ...corporationPay,
      amount: corporationPay.amount.toNumber(),
    }),
  ),
});
