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
import { exceedsInAgorot } from './utils/income-totals';

/**
 * What the client pays on the turnover summary (ריכוז מחזורי): the month's
 * income in partial payments, each with its day, never adding up to more than
 * the income; and the VAT on it, marked paid in one go with its own day.
 */
@Injectable()
export class ClientPaymentsService {
  private readonly logger = new Logger(ClientPaymentsService.name);

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * The report's income and what the client has paid towards it so far, read
   * inside the caller's transaction so the guard and the write see the same
   * rows.
   * @param excludePaymentId A payment left out of `paid` (the one being edited)
   */
  private async incomeAndPaid(
    tx: Prisma.TransactionClient,
    projectReportId: string,
    excludePaymentId?: string,
  ): Promise<{ income: number; paid: number; vatPaidAt: Date | null }> {
    const report = await tx.projectReport.findUnique({
      where: { id: projectReportId },
      select: {
        vatPaidAt: true,
        incomeEntries: { select: { amount: true } },
        clientPayments: { select: { id: true, amount: true } },
      },
    });
    if (!report) throw new ProjectReportNotFoundError(projectReportId);

    const income = report.incomeEntries.reduce(
      (sum, e) => sum + e.amount.toNumber(),
      0,
    );
    const paid = report.clientPayments
      .filter((p) => p.id !== excludePaymentId)
      .reduce((sum, p) => sum + p.amount.toNumber(), 0);
    return { income, paid, vatPaidAt: report.vatPaidAt };
  }

  async create(dto: CreateClientPaymentDto): Promise<ClientPaymentResponseDto> {
    const payment = await this.prismaService.$transaction(async (tx) => {
      const { income, paid } = await this.incomeAndPaid(
        tx,
        dto.projectReportId,
      );
      if (exceedsInAgorot(paid + dto.amount, income)) {
        throw new ClientPaymentOverpaymentError(income, paid, dto.amount);
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
        const { income, paid } = await this.incomeAndPaid(
          tx,
          existing.projectReportId,
          id,
        );
        if (exceedsInAgorot(paid + dto.amount, income)) {
          throw new ClientPaymentOverpaymentError(income, paid, dto.amount, id);
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
   * Marks the month's VAT paid on a day, or unpaid with null. The VAT often
   * arrives a month after the income; it is still marked on its own month.
   */
  async setVatPayment(
    projectReportId: string,
    vatPaidAt: string | null,
  ): Promise<void> {
    try {
      await this.prismaService.projectReport.update({
        where: { id: projectReportId },
        data: { vatPaidAt: vatPaidAt ? new Date(vatPaidAt) : null },
      });
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === PRISMA_ERROR_CODES.NOT_FOUND
      ) {
        throw new ProjectReportNotFoundError(projectReportId);
      }
      throw error;
    }
    this.logger.log(`Project report ${projectReportId} VAT paid: ${vatPaidAt}`);
  }

  /**
   * "Paid in full incl. VAT": whatever income is still owed becomes one
   * payment on that day, and the VAT is marked paid on it — unless already
   * marked, which keeps its own day. Both in one transaction.
   */
  async payInFull(projectReportId: string, paymentDate: string): Promise<void> {
    const day = new Date(paymentDate);
    await this.prismaService.$transaction(async (tx) => {
      const { income, paid, vatPaidAt } = await this.incomeAndPaid(
        tx,
        projectReportId,
      );
      const remaining = Math.round((income - paid) * 100) / 100;
      if (remaining > 0) {
        await tx.clientPayment.create({
          data: {
            projectReportId,
            amount: new Prisma.Decimal(remaining),
            paymentDate: day,
          },
        });
      }
      if (!vatPaidAt) {
        await tx.projectReport.update({
          where: { id: projectReportId },
          data: { vatPaidAt: day },
        });
      }
    });
    this.logger.log(`Project report ${projectReportId} paid in full`);
  }
}
