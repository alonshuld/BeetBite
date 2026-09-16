import { Injectable, Logger } from '@nestjs/common';
import { CreateSubcontractorPaymentDto } from './dto/create-subcontractor-payment.dto';
import { UpdateSubcontractorPaymentDto } from './dto/update-subcontractor-payment.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProjectClientAssignmentsService } from 'src/project-client-assignments/project-client-assignments.service';
import { SubcontractorPaymentResponseDto } from './dto/subcontractor-payments-response.dto';
import { toSubcontractorPaymentResponse } from './mappers/subcontractor-payment.mapper';
import { PrismaClientKnownRequestError } from 'src/generated/internal/prismaNamespace';
import { PRISMA_ERROR_CODES } from 'src/common/constants';
import { SubcontractorNotFoundError } from 'src/subcontractors/errors/subcontractor-not-found';
import { SubcontractorPaymentNotFoundError } from './errors/subcontractor-payment-not-found.error';
import { SubcontractorPaymentOverpaymentError } from './errors/subcontractor-payment-overpayment.error';
import { MonthQueryDto } from 'src/common/month-query.dto';
import {
  toMonthlySubcontractorPaymentsResponse,
  toMonthlySubcontractorPaymentsResponseList,
} from './mappers/monthly-subcontractor-payments.mapper';
import { MonthlySubcontractorPaymentsDto } from './dto/monthly-subcontractor-payments.dto';
import { SubcontractorPaymentsByClientResponseDto } from './dto/subcontractor-payments-by-client-response.dto';
import { toSubcontractorPaymentsByClientResponseList } from './mappers/subcontractor-payments-by-client.mapper';

@Injectable()
export class SubcontractorPaymentsService {
  private readonly logger = new Logger(SubcontractorPaymentsService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly assignmentsService: ProjectClientAssignmentsService,
  ) {}

  private async calculateProjectExpectedTotal(
    subcontractorId: string,
    projectId: string,
    serviceDate: Date,
  ): Promise<number> {
    const report = await this.prismaService.projectReport.findFirst({
      where: { subcontractorId, projectId, date: serviceDate },
      select: {
        profitMargin: true,
        incomeEntries: { select: { amount: true } },
        supplierPayments: { select: { amount: true } },
      },
    });

    if (!report) return 0;

    const income = report.incomeEntries.reduce(
      (s, e) => s + e.amount.toNumber(),
      0,
    );
    const afterProfit =
      income - (report.profitMargin.toNumber() * income) / 100;
    const corpTotal = report.supplierPayments.reduce(
      (s, p) => s + p.amount.toNumber(),
      0,
    );
    // The subcontractor receives whatever is left after profit and supplier
    // payments. When supplier payments exceed that remainder the subcontractor
    // is owed nothing, never a negative amount, so floor the result at zero.
    return Math.max(0, afterProfit - corpTotal);
  }

  private async calculateSubcontractorExpectedTotal(
    subcontractorId: string,
    serviceDate: Date,
  ): Promise<number> {
    const subcontractorMonthlyProjects =
      await this.prismaService.projectReport.findMany({
        where: { subcontractorId, date: serviceDate },
        select: {
          profitMargin: true,
          incomeEntries: { select: { amount: true } },
          supplierPayments: { select: { amount: true } },
        },
      });

    return subcontractorMonthlyProjects.reduce((total, project) => {
      const income = project.incomeEntries.reduce(
        (s, e) => s + e.amount.toNumber(),
        0,
      );
      const profitMargin = project.profitMargin.toNumber();
      const afterProfit = income - (profitMargin * income) / 100;
      const supplierPaymentsTotal = project.supplierPayments.reduce(
        (sum, payment) => sum + payment.amount.toNumber(),
        0,
      );
      // Floor each project at zero so one project's overage cannot cancel out
      // amounts legitimately owed on the subcontractor's other projects.
      return total + Math.max(0, afterProfit - supplierPaymentsTotal);
    }, 0);
  }

  private async calculateAllSubcontractorsExpectedTotal(
    serviceDate: Date,
  ): Promise<Record<string, number>> {
    const subcontractorsMonthlyProjects =
      await this.prismaService.projectReport.findMany({
        where: { date: serviceDate },
        select: {
          subcontractorId: true,
          profitMargin: true,
          incomeEntries: { select: { amount: true } },
          supplierPayments: { select: { amount: true } },
        },
      });

    const expectedTotalBySubcontractor = subcontractorsMonthlyProjects.reduce(
      (acc, project) => {
        const income = project.incomeEntries.reduce(
          (s, e) => s + e.amount.toNumber(),
          0,
        );
        const profitMargin = project.profitMargin.toNumber();
        const afterProfit = income - (profitMargin * income) / 100;
        const supplierPaymentsTotal = project.supplierPayments.reduce(
          (sum, payment) => sum + payment.amount.toNumber(),
          0,
        );
        // Floor each project at zero so one project's overage cannot cancel out
        // amounts legitimately owed on the subcontractor's other projects.
        const subcontractorPayment = Math.max(
          0,
          afterProfit - supplierPaymentsTotal,
        );

        acc[project.subcontractorId] =
          (acc[project.subcontractorId] ?? 0) + subcontractorPayment;
        return acc;
      },
      {} as Record<string, number>,
    );

    return expectedTotalBySubcontractor;
  }

  async create(
    createSubcontractorPaymentDto: CreateSubcontractorPaymentDto,
  ): Promise<SubcontractorPaymentResponseDto> {
    const serviceDate = new Date(createSubcontractorPaymentDto.serviceDate);

    try {
      const subcontractorPayment = await this.prismaService.$transaction(
        async (tx) => {
          const [amountOwed, existingPayments] = await Promise.all([
            this.calculateProjectExpectedTotal(
              createSubcontractorPaymentDto.subcontractorId,
              createSubcontractorPaymentDto.projectId,
              serviceDate,
            ),
            tx.subcontractorPayment.findMany({
              where: {
                subcontractorId: createSubcontractorPaymentDto.subcontractorId,
                projectId: createSubcontractorPaymentDto.projectId,
                serviceDate,
              },
              select: { amount: true },
            }),
          ]);

          const amountPaid = existingPayments.reduce(
            (sum, p) => sum + p.amount.toNumber(),
            0,
          );

          // Compare in integer cents to avoid two floating-point hazards:
          // 1. amountOwed is computed from Decimal fields via JS floats; multiplying by 100
          //    before rounding preserves cents-level precision (e.g. 7988.4400000000005 → 798844).
          //    Math.round(amountOwed) alone would truncate to 7988, incorrectly blocking a
          //    valid payment of 7988 when 0.44 was already paid.
          // 2. amountPaid is the sum of Decimal values converted to JS floats; accumulation
          //    error (e.g. 10 × 100.10 = 1001.0000000000001) could tip the comparison.
          if (
            Math.round(
              (amountPaid + createSubcontractorPaymentDto.amount) * 100,
            ) > Math.round(amountOwed * 100)
          ) {
            throw new SubcontractorPaymentOverpaymentError(
              amountOwed,
              amountPaid,
              createSubcontractorPaymentDto.amount,
            );
          }

          return tx.subcontractorPayment.create({
            data: createSubcontractorPaymentDto,
            select: {
              id: true,
              projectId: true,
              serviceDate: true,
              amount: true,
              isPaid: true,
              subcontractor: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          });
        },
      );

      this.logger.log(
        `Subcontractor payment created: ${subcontractorPayment.id}`,
      );

      return toSubcontractorPaymentResponse(subcontractorPayment);
    } catch (error) {
      if (error instanceof SubcontractorPaymentOverpaymentError) throw error;
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT_FAILED) {
          throw new SubcontractorNotFoundError(
            createSubcontractorPaymentDto.subcontractorId,
          );
        }
      }
      throw error;
    }
  }

  async findSubcontractorMonthlyPayments(
    subcontractorId: string,
    monthQuery: MonthQueryDto,
  ): Promise<MonthlySubcontractorPaymentsDto> {
    const serviceDate = new Date(monthQuery.month);

    const [subcontractorWithPayments, expectedTotal] = await Promise.all([
      this.prismaService.subcontractor.findUnique({
        where: { id: subcontractorId },
        select: {
          id: true,
          name: true,
          payments: {
            where: { serviceDate },
            select: {
              id: true,
              projectId: true,
              serviceDate: true,
              amount: true,
              isPaid: true,
            },
          },
        },
      }),
      this.calculateSubcontractorExpectedTotal(subcontractorId, serviceDate),
    ]);

    if (!subcontractorWithPayments) {
      throw new SubcontractorNotFoundError(subcontractorId);
    }

    this.logger.log(
      `Retrieved ${subcontractorWithPayments.payments.length} subcontractor payments for ID: ${subcontractorId}`,
    );

    return toMonthlySubcontractorPaymentsResponse({
      ...subcontractorWithPayments,
      expectedTotal,
      serviceDate,
    });
  }

  async findSubcontractorPaymentsInMonth(
    monthQuery: MonthQueryDto,
  ): Promise<MonthlySubcontractorPaymentsDto[]> {
    const serviceDate = new Date(monthQuery.month);

    const [subcontractorsWithPayments, expectedTotalBySubcontractor] =
      await Promise.all([
        this.prismaService.subcontractor.findMany({
          where: {
            payments: {
              some: {
                serviceDate: serviceDate,
              },
            },
          },
          select: {
            id: true,
            name: true,
            payments: {
              where: {
                serviceDate: serviceDate,
              },
              select: {
                id: true,
                projectId: true,
                serviceDate: true,
                amount: true,
                isPaid: true,
              },
            },
          },
        }),
        this.calculateAllSubcontractorsExpectedTotal(serviceDate),
      ]);

    const subcontractorsWithPaymentsAndTotal = subcontractorsWithPayments.map(
      (subcontractor) => ({
        ...subcontractor,
        expectedTotal: expectedTotalBySubcontractor[subcontractor.id] ?? 0,
        serviceDate,
      }),
    );

    this.logger.log(
      `Retrieved payments of ${subcontractorsWithPayments.length} subcontractors from ${serviceDate.toLocaleDateString()}`,
    );

    return toMonthlySubcontractorPaymentsResponseList(
      subcontractorsWithPaymentsAndTotal,
    );
  }

  async findByClient(
    monthQuery: MonthQueryDto,
  ): Promise<SubcontractorPaymentsByClientResponseDto[]> {
    const serviceDate = new Date(monthQuery.month);

    const payments = await this.prismaService.subcontractorPayment.findMany({
      where: { serviceDate },
      select: {
        amount: true,
        projectId: true,
        project: {
          select: {
            client: { select: { id: true, name: true } },
          },
        },
      },
    });

    this.logger.log(
      `Retrieved subcontractor payments by client for ${serviceDate.toLocaleDateString()}`,
    );

    // Group under whichever client owned each project in this service month —
    // a project that has since changed hands keeps its past months where they
    // were.
    const resolved = await this.assignmentsService.resolveClientsForMonth(
      serviceDate,
      payments.map((payment) => payment.projectId),
    );

    const paymentsWithResolvedClient = payments.map((payment) => {
      const client = resolved.get(payment.projectId);
      if (!client) {
        this.logger.warn(
          `Project ${payment.projectId} has no client assignment covering ${monthQuery.month}; falling back to its current client`,
        );
        return payment;
      }
      return { ...payment, project: { client } };
    });

    return toSubcontractorPaymentsByClientResponseList(
      paymentsWithResolvedClient,
    );
  }

  async update(
    id: string,
    updateSubcontractorPaymentDto: UpdateSubcontractorPaymentDto,
  ): Promise<SubcontractorPaymentResponseDto> {
    // An isPaid-only update omits `amount`, so there is no new total to
    // validate and the overpayment guard is skipped.
    const isMetadataOnlyUpdate =
      updateSubcontractorPaymentDto.amount === undefined;

    try {
      const subcontractorPayment = await this.prismaService.$transaction(
        async (tx) => {
          if (!isMetadataOnlyUpdate) {
            const serviceDate = new Date(
              updateSubcontractorPaymentDto.serviceDate!,
            );

            const [amountOwed, existingPayments] = await Promise.all([
              this.calculateProjectExpectedTotal(
                updateSubcontractorPaymentDto.subcontractorId!,
                updateSubcontractorPaymentDto.projectId!,
                serviceDate,
              ),
              tx.subcontractorPayment.findMany({
                where: {
                  subcontractorId:
                    updateSubcontractorPaymentDto.subcontractorId,
                  projectId: updateSubcontractorPaymentDto.projectId,
                  serviceDate,
                  NOT: { id },
                },
                select: { amount: true },
              }),
            ]);

            const amountPaid = existingPayments.reduce(
              (sum, p) => sum + p.amount.toNumber(),
              0,
            );

            if (
              Math.round(
                (amountPaid + updateSubcontractorPaymentDto.amount!) * 100,
              ) > Math.round(amountOwed * 100)
            ) {
              throw new SubcontractorPaymentOverpaymentError(
                amountOwed,
                amountPaid,
                updateSubcontractorPaymentDto.amount!,
                id,
              );
            }
          }

          return tx.subcontractorPayment.update({
            where: { id },
            data: updateSubcontractorPaymentDto,
            select: {
              id: true,
              projectId: true,
              serviceDate: true,
              amount: true,
              isPaid: true,
              subcontractor: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          });
        },
      );

      this.logger.log(`Subcontractor payment updated: ${id}`);

      return toSubcontractorPaymentResponse(subcontractorPayment);
    } catch (error) {
      if (error instanceof SubcontractorPaymentOverpaymentError) throw error;
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === PRISMA_ERROR_CODES.NOT_FOUND) {
          throw new SubcontractorPaymentNotFoundError(id);
        }
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prismaService.subcontractorPayment.delete({
        where: { id },
      });

      this.logger.log(`Subcontractor payment deleted: ${id}`);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === PRISMA_ERROR_CODES.NOT_FOUND) {
          throw new SubcontractorPaymentNotFoundError(id);
        }
      }
      throw error;
    }
  }
}
