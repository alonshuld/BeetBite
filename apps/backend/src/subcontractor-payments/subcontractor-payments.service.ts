import { Injectable, Logger } from '@nestjs/common';
import { CreateSubcontractorPaymentDto } from './dto/create-subcontractor-payment.dto';
import { UpdateSubcontractorPaymentDto } from './dto/update-subcontractor-payment.dto';
import { PrismaService } from 'src/prisma/prisma.service';
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

@Injectable()
export class SubcontractorPaymentsService {
  private readonly logger = new Logger(SubcontractorPaymentsService.name);

  constructor(private readonly prismaService: PrismaService) {}

  private async calculateSubcontractorExpectedTotal(
    subcontractorId: string,
    serviceDate: Date,
  ): Promise<number> {
    const subcontractorMonthlyProjects =
      await this.prismaService.projectReport.findMany({
        where: {
          subcontractorId,
          date: serviceDate,
        },
        select: {
          income: true,
          profitMargin: true,
          corporationPayments: {
            select: { amount: true },
          },
        },
      });

    return subcontractorMonthlyProjects.reduce((total, project) => {
      const income = project.income.toNumber();
      const profitMargin = project.profitMargin.toNumber();

      const afterProfit = income - (profitMargin * income) / 100;

      const corporationPaymentsTotal = project.corporationPayments.reduce(
        (sum, payment) => sum + payment.amount.toNumber(),
        0,
      );

      const subcontractorPayment = afterProfit - corporationPaymentsTotal;

      return total + subcontractorPayment;
    }, 0);
  }

  private async calculateAllSubcontractorsExpectedTotal(
    serviceDate: Date,
  ): Promise<Record<string, number>> {
    const subcontractorsMonthlyProjects =
      await this.prismaService.projectReport.findMany({
        where: {
          date: serviceDate,
        },
        select: {
          subcontractorId: true,
          income: true,
          profitMargin: true,
          corporationPayments: {
            select: { amount: true },
          },
        },
      });

    const expectedTotalBySubcontractor = subcontractorsMonthlyProjects.reduce(
      (acc, project) => {
        const income = project.income.toNumber();
        const profitMargin = project.profitMargin.toNumber();
        const afterProfit = income - (profitMargin * income) / 100;
        const corporationPaymentsTotal = project.corporationPayments.reduce(
          (sum, payment) => sum + payment.amount.toNumber(),
          0,
        );
        const subcontractorPayment = afterProfit - corporationPaymentsTotal;

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
            this.calculateSubcontractorExpectedTotal(
              createSubcontractorPaymentDto.subcontractorId,
              serviceDate,
            ),
            tx.subcontractorPayment.findMany({
              where: {
                subcontractorId: createSubcontractorPaymentDto.subcontractorId,
                serviceDate,
              },
              select: { amount: true },
            }),
          ]);

          const amountPaid = existingPayments.reduce(
            (sum, p) => sum + p.amount.toNumber(),
            0,
          );

          if (amountPaid + createSubcontractorPaymentDto.amount > amountOwed) {
            throw new SubcontractorPaymentOverpaymentError(
              amountOwed,
              amountPaid,
              createSubcontractorPaymentDto.amount,
            );
          }

          return tx.subcontractorPayment.create({
            data: { ...createSubcontractorPaymentDto },
            select: {
              id: true,
              serviceDate: true,
              paymentDate: true,
              amount: true,
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
              serviceDate: true,
              paymentDate: true,
              amount: true,
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
                serviceDate: true,
                paymentDate: true,
                amount: true,
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

  async update(
    id: string,
    updateSubcontractorPaymentDto: UpdateSubcontractorPaymentDto,
  ): Promise<SubcontractorPaymentResponseDto> {
    const serviceDate = new Date(updateSubcontractorPaymentDto.serviceDate);

    try {
      const subcontractorPayment = await this.prismaService.$transaction(
        async (tx) => {
          const [amountOwed, existingPayments] = await Promise.all([
            this.calculateSubcontractorExpectedTotal(
              updateSubcontractorPaymentDto.subcontractorId,
              serviceDate,
            ),
            tx.subcontractorPayment.findMany({
              where: {
                subcontractorId: updateSubcontractorPaymentDto.subcontractorId,
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

          if (amountPaid + updateSubcontractorPaymentDto.amount > amountOwed) {
            throw new SubcontractorPaymentOverpaymentError(
              amountOwed,
              amountPaid,
              updateSubcontractorPaymentDto.amount,
              id,
            );
          }

          return tx.subcontractorPayment.update({
            where: { id },
            data: { ...updateSubcontractorPaymentDto },
            select: {
              id: true,
              serviceDate: true,
              paymentDate: true,
              amount: true,
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
