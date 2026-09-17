import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';
import { MonthlySupplierPaymentsResponseDto } from './dto/monthly-supplier-payments-response.dto';
import { SupplierPaymentNotFoundError } from './errors/supplier-payment-not-found.error';
import { MonthQueryDto } from 'src/common/month-query.dto';
import { SupplierPaymentResponseDto } from './dto/supplier-payment-response.dto';
import {
  toMonthlySupplierPaymentsResponse,
  toMultipleMonthlySuppliersPaymentsResponse,
} from './mappers/monthly-supplier-payments.mapper';
import { toSupplierPaymentResponseDto } from './mappers/supplier-payment.mapper';
import { PrismaClientKnownRequestError } from 'src/generated/internal/prismaNamespace';
import { PRISMA_ERROR_CODES } from 'src/common/constants';
import { SupplierPaymentAlreadyExistsError } from './errors/supplier-payment-already-exists.error';
import { MultipleMonthlySupplierPaymentsResponseDto } from './dto/multiple-monthly-supplier-payments-response.dto';
import { UpdateSupplierPaymentDto } from './dto/update-supplier-payment.dto';
import { ProjectReportNotFoundError } from 'src/project-reports/errors/project-report-not-found.exception';
import { SupplierNotFoundError } from 'src/suppliers/errors/supplier-not-found.error';
import { EntityNotFoundError } from 'src/common/errors/entity-not-found.error';
import { VatRatesService } from 'src/vat-rates/vat-rates.service';

/**
 * Service responsible for managing supplier payments, including creating, fetching, updating, and deleting payments. It interacts with the database through PrismaService and handles various error scenarios related to supplier payments.
 */
@Injectable()
export class SupplierPaymentsService {
  private readonly logger = new Logger(SupplierPaymentsService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly vatRatesService: VatRatesService,
  ) {}

  /**
   * Calculates the start and end dates for a given month string in the format 'YYYY-MM'. The start date is set to the first day of the month, and the end date is set to the last day of the month.
   * @param month Month string in the format 'YYYY-MM' for which to calculate the start and end dates
   * @returns Start and end dates for the specified month
   */
  private calculateStartAndEndDates(month: string): {
    startDate: Date;
    endDate: Date;
  } {
    const ref = new Date(month);
    const startDate = new Date(
      Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), 1),
    );
    const endDate = new Date(
      Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() + 1, 0),
    );
    return { startDate, endDate };
  }

  /**
   * Creates a new supplier payment based on the provided DTO and returns the created payment as a SupplierPaymentResponseDto. Handles potential errors such as foreign key constraints and unique constraint violations.
   * @param createSupplierPaymentDto Supplier payment creation DTO containing the necessary information to create a supplier payment
   * @returns SupplierPaymentResponseDto representing the created supplier payment
   */
  async create(
    createSupplierPaymentDto: CreateSupplierPaymentDto,
  ): Promise<SupplierPaymentResponseDto> {
    try {
      const defaultVatPercentage =
        !createSupplierPaymentDto.isFuture &&
        createSupplierPaymentDto.vatPercentage === undefined
          ? await this.vatRatesService.resolveForMonth(
              createSupplierPaymentDto.date,
            )
          : undefined;

      const data = {
        ...createSupplierPaymentDto,
        date: createSupplierPaymentDto.date
          ? new Date(createSupplierPaymentDto.date)
          : null,
        vatPercentage:
          createSupplierPaymentDto.vatPercentage ??
          defaultVatPercentage ??
          undefined,
      };

      const supplierPayment = await this.prismaService.supplierPayment.create({
        data,
        select: {
          id: true,
          amount: true,
          date: true,
          description: true,
          isFuture: true,
          vatPercentage: true,
          projectReportId: true,
          supplierId: true,
          projectReport: {
            select: {
              id: true,
              projectId: true,
              project: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          supplier: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      this.logger.log(
        `Created supplier payment with ID: ${supplierPayment.id}`,
      );

      return toSupplierPaymentResponseDto(supplierPayment);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        switch (error.code) {
          case PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT_FAILED: {
            const fieldName = (error.meta?.field_name as string) ?? '';

            if (fieldName.toLowerCase().includes('projectreportid'))
              throw new ProjectReportNotFoundError(
                createSupplierPaymentDto.projectReportId,
              );
            if (fieldName.toLowerCase().includes('supplierid'))
              throw new SupplierNotFoundError(
                createSupplierPaymentDto.supplierId,
              );

            throw new EntityNotFoundError(
              'Could not find either the existing project report or supplier for the given supplier payment',
            );
          }
          case PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED:
            throw new SupplierPaymentAlreadyExistsError(
              createSupplierPaymentDto.supplierId,
              createSupplierPaymentDto.date,
            );
        }
      }
      throw error;
    }
  }

  /**
   * Fetches all payments for a specific supplier within a given month. The month is specified in the MonthQueryDto, and the supplier is identified by its ID. Returns a MonthlySupplierPaymentsResponseDto containing the supplier's details and its payments for the specified month. Handles potential errors such as supplier not found.
   * @param supplierId Supplier ID for which to fetch the monthly payments
   * @param monthQueryDto Month query DTO containing the month to filter payments by
   * @returns MonthlySupplierPaymentsResponseDto containing the supplier's details and its payments for the specified month
   */
  async findSupplierMonthlyPayments(
    supplierId: string,
    monthQueryDto: MonthQueryDto,
  ): Promise<MonthlySupplierPaymentsResponseDto> {
    const { startDate, endDate } = this.calculateStartAndEndDates(
      monthQueryDto.month,
    );

    const supplier = await this.prismaService.supplier.findUnique({
      where: { id: supplierId },
      select: {
        id: true,
        name: true,
        payments: {
          where: {
            projectReport: { date: { gte: startDate, lte: endDate } },
          },
          select: {
            id: true,
            amount: true,
            date: true,
            vatPercentage: true,
            isFuture: true,
            description: true,
            projectReport: {
              select: {
                id: true,
                project: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!supplier) {
      throw new SupplierNotFoundError(supplierId);
    }

    this.logger.log(
      `Fetched ${supplier.payments.length} payments for supplier ID: ${supplierId} and month: ${monthQueryDto.month}`,
    );

    return toMonthlySupplierPaymentsResponse(supplier);
  }

  /**
   * Fetches payments for all suppliers within a given month. The month is specified in the MonthQueryDto. Returns a MultipleMonthlySupplierPaymentsResponseDto containing a list of suppliers, each with their details and payments for the specified month. Handles potential errors such as no suppliers found with payments in the specified month.
   * @param monthQueryDto Month query DTO containing the month to filter payments by
   * @returns MultipleMonthlySupplierPaymentsResponseDto containing all supplier payments for the specified month grouped by supplier
   */
  async findSuppliersPaymentsInMonth(
    monthQueryDto: MonthQueryDto,
  ): Promise<MultipleMonthlySupplierPaymentsResponseDto> {
    const { startDate, endDate } = this.calculateStartAndEndDates(
      monthQueryDto.month,
    );

    const suppliers = await this.prismaService.supplier.findMany({
      where: {
        payments: {
          some: {
            projectReport: { date: { gte: startDate, lte: endDate } },
          },
        },
      },
      select: {
        id: true,
        name: true,
        payments: {
          where: {
            projectReport: { date: { gte: startDate, lte: endDate } },
          },
          select: {
            id: true,
            amount: true,
            date: true,
            vatPercentage: true,
            isFuture: true,
            description: true,
            projectReport: {
              select: {
                id: true,
                project: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    this.logger.log(
      `Fetched payments for ${suppliers.length} suppliers for month: ${monthQueryDto.month}`,
    );

    return toMultipleMonthlySuppliersPaymentsResponse(suppliers);
  }

  /**
   * Updates an existing supplier payment with the provided ID using the data from the UpdateSupplierPaymentDto. Handles potential errors such as not found, foreign key constraints, and unique constraint violations.
   * @param supplierPaymentId Supplier payment ID of the payment to be updated
   * @param updateSupplierPaymentDto Supplier payment update DTO containing the new data for the supplier payment
   * @returns SupplierPaymentResponseDto representing the updated supplier payment
   */
  async update(
    supplierPaymentId: string,
    updateSupplierPaymentDto: UpdateSupplierPaymentDto,
  ): Promise<SupplierPaymentResponseDto> {
    try {
      const defaultVatPercentage =
        !updateSupplierPaymentDto.isFuture &&
        updateSupplierPaymentDto.vatPercentage === undefined
          ? await this.vatRatesService.resolveForMonth(
              updateSupplierPaymentDto.date,
            )
          : undefined;

      const data = {
        ...updateSupplierPaymentDto,
        date: updateSupplierPaymentDto.date
          ? new Date(updateSupplierPaymentDto.date)
          : null,
        vatPercentage:
          updateSupplierPaymentDto.vatPercentage ??
          defaultVatPercentage ??
          undefined,
      };

      const updatedSupplierPayment =
        await this.prismaService.supplierPayment.update({
          where: { id: supplierPaymentId },
          data,
          select: {
            id: true,
            amount: true,
            date: true,
            description: true,
            isFuture: true,
            vatPercentage: true,
            projectReportId: true,
            supplierId: true,
            projectReport: {
              select: {
                id: true,
                projectId: true,
                project: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            supplier: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

      this.logger.log(`Updated supplier payment with ID: ${supplierPaymentId}`);

      return toSupplierPaymentResponseDto(updatedSupplierPayment);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        switch (error.code) {
          case PRISMA_ERROR_CODES.NOT_FOUND:
            throw new SupplierPaymentNotFoundError(supplierPaymentId);
          case PRISMA_ERROR_CODES.FOREIGN_KEY_CONSTRAINT_FAILED: {
            const fieldName = (error.meta?.field_name as string) ?? '';

            if (fieldName.toLowerCase().includes('projectreportid'))
              throw new ProjectReportNotFoundError(
                updateSupplierPaymentDto.projectReportId,
              );
            if (fieldName.toLowerCase().includes('supplierid'))
              throw new SupplierNotFoundError(
                updateSupplierPaymentDto.supplierId,
              );

            throw new EntityNotFoundError(
              'Could not find either the existing project report or supplier for the given supplier payment',
            );
          }
          case PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED:
            throw new SupplierPaymentAlreadyExistsError(
              updateSupplierPaymentDto.supplierId,
              updateSupplierPaymentDto.date,
            );
        }
      }
      throw error;
    }
  }

  /**
   * Removes a supplier payment by its ID
   * @param id ID of the supplier payment to be removed
   */
  async remove(id: string): Promise<void> {
    try {
      await this.prismaService.supplierPayment.delete({
        where: { id },
      });

      this.logger.log(`Deleted supplier payment with ID: ${id}`);
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === PRISMA_ERROR_CODES.NOT_FOUND
      ) {
        throw new SupplierPaymentNotFoundError(id);
      }
      throw error;
    }
  }
}
