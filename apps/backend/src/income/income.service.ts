import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProjectClientAssignmentsService } from 'src/project-client-assignments/project-client-assignments.service';
import {
  MonthlyIncomeItemDto,
  MonthlyIncomeProjectDto,
} from './dto/monthly-income-item.dto';
import { mapIncomeEntries } from 'src/project-reports/mappers/project-reports.mapper';
import { VatRatesService } from 'src/vat-rates/vat-rates.service';
import { toClientPaymentResponse } from './mappers/client-payment.mapper';
import { deriveIncomeTotals } from './utils/income-totals';

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
          incomeIncludesVat: true,
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
          profitMargin: true,
          incomeEntries: {
            select: {
              id: true,
              amount: true,
              incomeDate: true,
              tag: true,
            },
            // Stable order, so a row doesn't jump when its date is edited in place.
            orderBy: { id: 'asc' },
          },
          clientPayments: {
            select: {
              id: true,
              projectReportId: true,
              amount: true,
              paymentDate: true,
            },
            orderBy: [{ paymentDate: 'asc' }, { id: 'asc' }],
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
        report.incomeIncludesVat,
        vatRates,
        report.date,
      );
      // Received is what the client's payments add up to; the received date
      // on each income entry no longer decides it.
      const receivedIncome = report.clientPayments.reduce(
        (sum, p) => sum + p.amount.toNumber(),
        0,
      );
      const pendingIncome = Math.max(0, totalWithVat - receivedIncome);
      const profit =
        (totalIncome * (report.profitMargin?.toNumber() ?? 0)) / 100;

      clientEntry.projects.set(report.projectId, {
        reportId: report.id,
        projectId: report.projectId,
        projectName: report.project.name,
        requesterName: report.project.requesterName,
        totalIncome,
        incomeIncludesVat: report.incomeIncludesVat,
        vatPercentage,
        vatAmount,
        totalWithVat,
        receivedIncome,
        pendingIncome,
        profit,
        incomeEntries: mapIncomeEntries(report.incomeEntries),
        payments: report.clientPayments.map(toClientPaymentResponse),
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
        totalVat: sum((p) => p.vatAmount),
        totalWithVat: sum((p) => p.totalWithVat),
        totalReceived: sum((p) => p.receivedIncome),
        totalProfit: sum((p) => p.profit),
      };
    });
  }
}
