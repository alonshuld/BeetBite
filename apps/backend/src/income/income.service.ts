import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  MonthlyIncomeItemDto,
  MonthlyIncomeProjectDto,
} from './dto/monthly-income-item.dto';

@Injectable()
export class IncomeService {
  private readonly logger = new Logger(IncomeService.name);

  constructor(private readonly prismaService: PrismaService) {}

  async getMonthlyIncome(month: string): Promise<MonthlyIncomeItemDto[]> {
    const ref = new Date(month);
    const startOfMonth = new Date(
      Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), 1),
    );
    const startOfNextMonth = new Date(
      Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() + 1, 1),
    );

    const reports = await this.prismaService.projectReport.findMany({
      where: {
        date: {
          gte: startOfMonth,
          lt: startOfNextMonth,
        },
      },
      select: {
        projectId: true,
        project: {
          select: {
            name: true,
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
            amount: true,
            incomeDate: true,
          },
        },
      },
    });

    this.logger.log(
      `Retrieved ${reports.length} project reports for month ${month}`,
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
      const client = report.project.client;
      if (!clientMap.has(client.id)) {
        clientMap.set(client.id, {
          clientId: client.id,
          clientName: client.name,
          projects: new Map(),
        });
      }
      const clientEntry = clientMap.get(client.id)!;

      const totalIncome = report.incomeEntries.reduce(
        (sum, e) => sum + e.amount.toNumber(),
        0,
      );
      const receivedIncome = report.incomeEntries
        .filter((e) => e.incomeDate !== null)
        .reduce((sum, e) => sum + e.amount.toNumber(), 0);
      const pendingIncome = totalIncome - receivedIncome;
      const profit =
        (totalIncome * (report.profitMargin?.toNumber() ?? 0)) / 100;

      clientEntry.projects.set(report.projectId, {
        projectId: report.projectId,
        projectName: report.project.name,
        totalIncome,
        receivedIncome,
        pendingIncome,
        profit,
      });
    }

    return Array.from(clientMap.values()).map((clientEntry) => {
      const projects = Array.from(clientEntry.projects.values());
      const totalIncome = projects.reduce((sum, p) => sum + p.totalIncome, 0);
      const totalProfit = projects.reduce((sum, p) => sum + p.profit, 0);
      return {
        clientId: clientEntry.clientId,
        clientName: clientEntry.clientName,
        projects,
        totalIncome,
        totalProfit,
      };
    });
  }
}
