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
import { MonthQueryDto } from 'src/common/month-query.dto';
import {
  toMonthlySubcontractorPaymentsResponse,
  toMonthlySubcontractorPaymentsResponseList,
} from './mappers/monthly-subcontractor-payments.mapper';
import { MonthlySubcontractorPaymentsDto } from './dto/monthly-subcontractor-payments.dto';

/**
 * Service providing subcontractor payment business logic.
 * Handles create, read, update, and delete operations.
 * @param prismaService PrismaService for database interactions
 */
@Injectable()
export class SubcontractorPaymentsService {
  private readonly logger = new Logger(SubcontractorPaymentsService.name);

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Calculates the payment amount for a subcontractor based on their projects in a given service month.
   * @param subcontractorId Subcontractor ID for which the payment amount will be calculated
   * @param serviceDate Date representing the service month for which the payment amount will be calculated
   * @returns The calculated payment amount for the subcontractor in the given service month
   */
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

  /**
   * Create a new subcontractor payment
   * @param createSubcontractorPaymentDto Parameters for subcontractor payment creation
   * @returns The created subcontractor payment response DTO
   */
  async create(
    createSubcontractorPaymentDto: CreateSubcontractorPaymentDto,
  ): Promise<SubcontractorPaymentResponseDto> {
    try {
      const subcontractorPayment =
        await this.prismaService.subcontractorPayment.create({
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

      this.logger.log(
        `Subcontractor payment created: ${subcontractorPayment.id}`,
      );

      return toSubcontractorPaymentResponse(subcontractorPayment);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        switch (error.code) {
          case PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT_FAILED:
            throw new SubcontractorNotFoundError(
              createSubcontractorPaymentDto.subcontractorId,
            );
        }
      }
      throw error;
    }
  }

  /**
   * Find all of the subcontractor payments for a given subcontractor in a given service month,
   * along with the expected total payment amount for that month
   * @param subcontractorId ID of the subcontractor for which payments will be retrieved
   * @param monthQuery The service month for which payments will be retrieved
   * @returns List of the subcontractor payments for the given subcontractor and service month, along with the expected total payment amount for that month
   */
  async findSubcontractorMonthlyPayments(
    subcontractorId: string,
    monthQuery: MonthQueryDto,
  ): Promise<MonthlySubcontractorPaymentsDto> {
    const [subcontractorWithPayments, expectedTotal] = await Promise.all([
      this.prismaService.subcontractor.findUnique({
        where: { id: subcontractorId },
        select: {
          id: true,
          name: true,
          payments: {
            where: { serviceDate: new Date(monthQuery.month) },
            select: {
              id: true,
              serviceDate: true,
              paymentDate: true,
              amount: true,
            },
          },
        },
      }),
      this.calculateSubcontractorExpectedTotal(
        subcontractorId,
        new Date(monthQuery.month),
      ),
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
    });
  }

  /**
   * Get all of the subcontractor payments from a service month
   * @param paginatedMonthQueryDto The service month of the payments that will be retrieved
   * @returns List of all of the subcontractor payments from the matching service date
   */
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
      }),
    );

    this.logger.log(
      `Retrieved payments of ${subcontractorsWithPayments.length} subcontractors from ${serviceDate.toLocaleDateString()}`,
    );

    return toMonthlySubcontractorPaymentsResponseList(
      subcontractorsWithPaymentsAndTotal,
    );
  }

  /**
   * Updates a subcontractor payment by its ID.
   * @param id ID of the subcontractor payment to update
   * @param updateSubcontractorPaymentDto The DTO containing updated subcontractor payment details.
   * @returns The updated subcontractor payment.
   */
  async update(
    id: string,
    updateSubcontractorPaymentDto: UpdateSubcontractorPaymentDto,
  ): Promise<SubcontractorPaymentResponseDto> {
    try {
      const subcontractorPayment =
        await this.prismaService.subcontractorPayment.update({
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

      this.logger.log(`Subcontractor payment updated: ${id}`);

      return toSubcontractorPaymentResponse(subcontractorPayment);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        switch (error.code) {
          case PRISMA_ERROR_CODES.NOT_FOUND:
            throw new SubcontractorPaymentNotFoundError(id);
        }
      }
      throw error;
    }
  }

  /**
   * Removes a subcontractor payment by its ID.
   * @param id ID of the subcontractor payment to remove
   */
  async remove(id: string): Promise<void> {
    try {
      await this.prismaService.subcontractorPayment.delete({
        where: { id },
      });

      this.logger.log(`Subcontractor payment deleted: ${id}`);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        switch (error.code) {
          case PRISMA_ERROR_CODES.NOT_FOUND:
            throw new SubcontractorPaymentNotFoundError(id);
        }
      }
      throw error;
    }
  }
}
