import { Injectable, Logger } from '@nestjs/common';
import { CreateSubcontractorPaymentDto } from './dto/create-subcontractor-payment.dto';
import { UpdateSubcontractorPaymentDto } from './dto/update-subcontractor-payment.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { SubcontractorPaymentResponseDto } from './dto/subcontractor-payments-response.dto';
import {
  toSubcontractorPaymentResponse,
  toSubcontractorPaymentResponseList,
} from './mappers/subcontractor-payment.mapper';
import { PrismaClientKnownRequestError } from 'src/generated/internal/prismaNamespace';
import { PAGINATION_DEFAULTS, PRISMA_ERROR_CODES } from 'src/common/constants';
import { SubcontractorNotFoundError } from 'src/subcontractors/errors/subcontractor-not-found';
import { SubcontractorPaymentAlreadyExistsError } from './errors/subcontractor-payment-already-exists.error';
import { SubcontractorPaymentNotFoundError } from './errors/subcontractor-payment-not-found.error';
import { PaginatedMonthQueryDto } from 'src/common/paginated-month-query.dto';

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
  private async calculateSubcontractorPaymentAmount(
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
        });

      this.logger.log(
        `Subcontractor payment created: ${subcontractorPayment.id}`,
      );

      const amount = await this.calculateSubcontractorPaymentAmount(
        createSubcontractorPaymentDto.subcontractorId,
        new Date(createSubcontractorPaymentDto.serviceDate),
      );

      return toSubcontractorPaymentResponse(subcontractorPayment, amount);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        switch (error.code) {
          case PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT_FAILED:
            throw new SubcontractorNotFoundError(
              createSubcontractorPaymentDto.subcontractorId,
            );
          case PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED:
            throw new SubcontractorPaymentAlreadyExistsError(
              createSubcontractorPaymentDto.subcontractorId,
              createSubcontractorPaymentDto.serviceDate,
            );
        }
      }
      throw error;
    }
  }

  /**
   * Get all of the subcontractor payments from a service month
   * @param paginatedMonthQueryDto The service month of the payments that will be retrieved
   * @returns List of all of the subcontractor payments from the matching service date
   */
  async findAll(
    paginatedMonthQueryDto: PaginatedMonthQueryDto,
  ): Promise<SubcontractorPaymentResponseDto[]> {
    const page = paginatedMonthQueryDto.page ?? PAGINATION_DEFAULTS.PAGE;
    const limit = paginatedMonthQueryDto.limit ?? PAGINATION_DEFAULTS.LIMIT;

    const subcontractorPayments =
      await this.prismaService.subcontractorPayment.findMany({
        where: { serviceDate: paginatedMonthQueryDto.month },
        skip: Math.max(0, (page - 1) * limit),
        take: Math.max(1, limit),
      });

    this.logger.log(
      `Retrieved ${subcontractorPayments.length} subcontractor payments from ${paginatedMonthQueryDto.month}`,
    );

    return toSubcontractorPaymentResponseList(subcontractorPayments);
  }

  /**
   * Find subcontractor payment with matching ID
   * @param id ID of the subcontractor payment to retrieve
   * @returns The corresponding subcontractor payment
   */
  async findOne(id: string): Promise<SubcontractorPaymentResponseDto> {
    const subcontractorPayment =
      await this.prismaService.subcontractorPayment.findUnique({
        where: { id },
      });

    if (!subcontractorPayment) {
      throw new SubcontractorPaymentNotFoundError(id);
    }

    this.logger.log(`Subcontractor payment retrieved: ${id}`);

    const amount = await this.calculateSubcontractorPaymentAmount(
      subcontractorPayment.subcontractorId,
      subcontractorPayment.serviceDate,
    );

    return toSubcontractorPaymentResponse(subcontractorPayment, amount);
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
        });

      this.logger.log(`Subcontractor payment updated: ${id}`);

      const amount = await this.calculateSubcontractorPaymentAmount(
        subcontractorPayment.subcontractorId,
        subcontractorPayment.serviceDate,
      );

      return toSubcontractorPaymentResponse(subcontractorPayment, amount);
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
