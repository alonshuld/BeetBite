import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProjectClientAssignmentsService } from 'src/project-client-assignments/project-client-assignments.service';
import {
  MonthlyIncomeItemDto,
  MonthlyIncomeProjectDto,
} from './dto/monthly-income-item.dto';
import { SetReportPaymentDto } from './dto/set-report-payment.dto';
import { mapIncomeEntries } from 'src/project-reports/mappers/project-reports.mapper';
import { VatRatesService } from 'src/vat-rates/vat-rates.service';
import { PrismaClientKnownRequestError } from 'src/generated/internal/prismaNamespace';
import { PRISMA_ERROR_CODES } from 'src/common/constants';
import { ProjectReportNotFoundError } from 'src/project-reports/errors/project-report-not-found.exception';
import { deriveIncomeTotals } from './utils/income-totals';

/** A stored paid date as the API returns it, or null while unpaid. */
const toPaidAt = (date: Date | null): string | null =>
  date ? date.toISOString() : null;

/** A paid date from the request: a day, null to clear, undefined to leave as is. */
const fromPaidAt = (value: string | null | undefined) =>
  value === undefined ? undefined : value === null ? null : new Date(value);

@Injectable()
export class IncomeService {
  private readonly logger = new Logger(IncomeService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly assignmentsService: ProjectClientAssignmentsService,
    private readonly vatRatesService: VatRatesService,
  ) {}

  async getMonthlyIncome(month: string): Promise<MonthlyIncomeItemDto[]> {
    const ref = new Date(month);
    const startOfMonth = new Date(
      Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), 1),
    );
    const startOfNextMonth = new Date(
      Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() + 1, 1),
    );

    const [reports, vatRates] = await Promise.all([
      this.prismaService.projectReport.findMany({
        where: {
          date: {
            gte: startOfMonth,
            lt: startOfNextMonth,
          },
        },
        select: {
          id: true,
          date: true,
          projectId: true,
          incomePaidAt: true,
          vatPaidAt: true,
          project: {
            select: {
              name: true,
              requesterName: true,
              client: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          incomeEntries: {
            select: {
              id: true,
              amount: true,
              incomeDate: true,
              tag: true,
            },
            // Stable order, so the entries listed under a row never reshuffle.
            orderBy: { id: 'asc' },
          },
        },
      }),
      this.vatRatesService.findAllEntries(),
    ]);

    this.logger.log(
      `Retrieved ${reports.length} project reports for month ${month}`,
    );

    // Which client owned each project *that month* — not whoever owns it now.
    // A project can change hands, and past months keep their original client.
    const resolvedClients =
      await this.assignmentsService.resolveClientsForMonth(
        month,
        reports.map((r) => r.projectId),
      );

    // Group by client, then by project within client
    const clientMap = new Map<
      string,
      {
        clientId: string;
        clientName: string;
        projects: Map<string, MonthlyIncomeProjectDto>;
      }
    >();

    for (const report of reports) {
      // Fall back to the project's cached client if no assignment covers this
      // month. That should be impossible after the backfill — but returning
      // nothing would silently drop the report from the screen, so prefer a
      // loud log and a sane answer over a vanishing row.
      const client = resolvedClients.get(report.projectId);
      if (!client) {
        this.logger.warn(
          `Project ${report.projectId} has no client assignment covering ${month}; falling back to its current client`,
        );
      }
      const resolvedClient = client ?? report.project.client;
      if (!clientMap.has(resolvedClient.id)) {
        clientMap.set(resolvedClient.id, {
          clientId: resolvedClient.id,
          clientName: resolvedClient.name,
          projects: new Map(),
        });
      }
      const clientEntry = clientMap.get(resolvedClient.id)!;

      const totalIncome = report.incomeEntries.reduce(
        (sum, e) => sum + e.amount.toNumber(),
        0,
      );
      const { vatPercentage, vatAmount, totalWithVat } = deriveIncomeTotals(
        totalIncome,
        vatRates,
        report.date,
      );

      clientEntry.projects.set(report.projectId, {
        reportId: report.id,
        projectId: report.projectId,
        projectName: report.project.name,
        requesterName: report.project.requesterName,
        totalIncome,
        vatPercentage,
        vatAmount,
        totalWithVat,
        incomePaidAt: toPaidAt(report.incomePaidAt),
        vatPaidAt: toPaidAt(report.vatPaidAt),
        incomeEntries: mapIncomeEntries(report.incomeEntries),
      });
    }

    return Array.from(clientMap.values()).map((clientEntry) => {
      const projects = Array.from(clientEntry.projects.values());
      const sum = (pick: (p: MonthlyIncomeProjectDto) => number) =>
        projects.reduce((total, p) => total + pick(p), 0);
      return {
        clientId: clientEntry.clientId,
        clientName: clientEntry.clientName,
        projects,
        totalIncome: sum((p) => p.totalIncome),
        incomePaid: sum((p) => (p.incomePaidAt ? p.totalIncome : 0)),
        totalVat: sum((p) => p.vatAmount),
        vatPaid: sum((p) => (p.vatPaidAt ? p.vatAmount : 0)),
        totalWithVat: sum((p) => p.totalWithVat),
      };
    });
  }

  /**
   * Marks a month's income and/or its VAT paid on a date, or unpaid with null.
   * The two are independent: a client often pays the income now and the VAT a
   * month later, and the VAT is then marked on the month it belongs to.
   */
  async setReportPayment(
    reportId: string,
    dto: SetReportPaymentDto,
  ): Promise<void> {
    try {
      await this.prismaService.projectReport.update({
        where: { id: reportId },
        data: {
          incomePaidAt: fromPaidAt(dto.incomePaidAt),
          vatPaidAt: fromPaidAt(dto.vatPaidAt),
        },
      });
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === PRISMA_ERROR_CODES.NOT_FOUND
      ) {
        throw new ProjectReportNotFoundError(reportId);
      }
      throw error;
    }
    this.logger.log(`Project report ${reportId} payment marks updated`);
  }
}
