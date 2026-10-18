import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from 'src/generated/client';
import { PrismaClientKnownRequestError } from 'src/generated/internal/prismaNamespace';
import { PRISMA_ERROR_CODES } from 'src/common/constants';
import { ProjectReportNotFoundError } from 'src/project-reports/errors/project-report-not-found.exception';
import { CreateClientPaymentDto } from './dto/create-client-payment.dto';
import { UpdateClientPaymentDto } from './dto/update-client-payment.dto';
import { ClientPaymentResponseDto } from './dto/client-payment-response.dto';
import { toClientPaymentResponse } from './mappers/client-payment.mapper';
import { ClientPaymentNotFoundError } from './errors/client-payment-not-found.error';
import { ClientPaymentOverpaymentError } from './errors/client-payment-overpayment.error';
import { ClientPaymentsExceedTotalError } from './errors/client-payments-exceed-total.error';
import { deriveIncomeTotals, exceedsInAgorot } from './utils/income-totals';

/**
 * Partial payments a client makes towards one month of one project, and the
 * month's choice to charge VAT on top. The client owes the report's income,
 * plus VAT when the report carries it; payments may never add up to more.
 */
@Injectable()
export class ClientPaymentsService {
  private readonly logger = new Logger(ClientPaymentsService.name);

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * What the client owes for a report and what they have paid towards it so
   * far, read inside the caller's transaction so the guard and the write see
   * the same rows.
   * @param includesVat Overrides the report's stored VAT choice (to test a change)
   * @param excludePaymentId A payment left out of `paid` (the one being edited)
   */
  private async owedAndPaid(
    tx: Prisma.TransactionClient,
    projectReportId: string,
    options: { includesVat?: boolean; excludePaymentId?: string } = {},
  ): Promise<{ owed: number; paid: number }> {
    const [report, rates] = await Promise.all([
      tx.projectReport.findUnique({
        where: { id: projectReportId },
        select: {
          date: true,
          incomeIncludesVat: true,
          incomeEntries: { select: { amount: true } },
          clientPayments: { select: { id: true, amount: true } },
        },
      }),
      tx.vatRate.findMany(),
    ]);
    if (!report) throw new ProjectReportNotFoundError(projectReportId);

    const income = report.incomeEntries.reduce(
      (sum, e) => sum + e.amount.toNumber(),
      0,
    );
    const { totalWithVat } = deriveIncomeTotals(
      income,
      options.includesVat ?? report.incomeIncludesVat,
      rates,
      report.date,
    );
    const paid = report.clientPayments
      .filter((p) => p.id !== options.excludePaymentId)
      .reduce((sum, p) => sum + p.amount.toNumber(), 0);
    return { owed: totalWithVat, paid };
  }

  async create(dto: CreateClientPaymentDto): Promise<ClientPaymentResponseDto> {
    const payment = await this.prismaService.$transaction(async (tx) => {
      const { owed, paid } = await this.owedAndPaid(tx, dto.projectReportId);
      if (exceedsInAgorot(paid + dto.amount, owed)) {
        throw new ClientPaymentOverpaymentError(owed, paid, dto.amount);
      }
      return tx.clientPayment.create({
        data: {
          projectReportId: dto.projectReportId,
          amount: new Prisma.Decimal(dto.amount),
          paymentDate: new Date(dto.paymentDate),
        },
      });
    });
    this.logger.log(`Client payment created: ${payment.id}`);
    return toClientPaymentResponse(payment);
  }

  async update(
    id: string,
    dto: UpdateClientPaymentDto,
  ): Promise<ClientPaymentResponseDto> {
    const payment = await this.prismaService.$transaction(async (tx) => {
      const existing = await tx.clientPayment.findUnique({
        where: { id },
        select: { projectReportId: true },
      });
      if (!existing) throw new ClientPaymentNotFoundError(id);

      if (dto.amount !== undefined) {
        const { owed, paid } = await this.owedAndPaid(
          tx,
          existing.projectReportId,
          { excludePaymentId: id },
        );
        if (exceedsInAgorot(paid + dto.amount, owed)) {
          throw new ClientPaymentOverpaymentError(owed, paid, dto.amount, id);
        }
      }

      return tx.clientPayment.update({
        where: { id },
        data: {
          amount:
            dto.amount !== undefined
              ? new Prisma.Decimal(dto.amount)
              : undefined,
          paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : undefined,
        },
      });
    });
    this.logger.log(`Client payment updated: ${id}`);
    return toClientPaymentResponse(payment);
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prismaService.clientPayment.delete({ where: { id } });
      this.logger.log(`Client payment deleted: ${id}`);
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === PRISMA_ERROR_CODES.NOT_FOUND
      ) {
        throw new ClientPaymentNotFoundError(id);
      }
      throw error;
    }
  }

  /**
   * Whether the client pays VAT on top of this month's income. Refused when
   * turning it off would leave the payments already recorded above the income
   * alone — those payments would then claim more than the client owes.
   */
  async setIncomeVat(
    projectReportId: string,
    incomeIncludesVat: boolean,
  ): Promise<void> {
    await this.prismaService.$transaction(async (tx) => {
      const { owed, paid } = await this.owedAndPaid(tx, projectReportId, {
        includesVat: incomeIncludesVat,
      });
      if (exceedsInAgorot(paid, owed)) {
        throw new ClientPaymentsExceedTotalError(owed, paid);
      }
      await tx.projectReport.update({
        where: { id: projectReportId },
        data: { incomeIncludesVat },
      });
    });
    this.logger.log(
      `Project report ${projectReportId} income VAT set to ${incomeIncludesVat}`,
    );
  }
}
